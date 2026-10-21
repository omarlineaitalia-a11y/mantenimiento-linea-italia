package mx.lineaitalia.alarmasparos

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.ListenerRegistration

/**
 * Servicio que se queda vigilando las fallas "esperando técnico" de Control de Paros.
 * Funciona aunque la página y el navegador estén cerrados. Al llegar una falla nueva
 * abre la alarma a pantalla completa (enciende la pantalla y suena).
 */
class VigiaService : Service() {
    private var reg: ListenerRegistration? = null
    private val h = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        canales(this)
        ServiceCompat.startForeground(
            this, 1, fija("Iniciando vigilancia…"),
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        )
        // alarmas desactivadas en este equipo (personal que no está laborando): no vigilar
        if (!Cfg.activo(this) && intent?.action != Cfg.ACCION_PRUEBA) {
            estado("🔕 Alarmas desactivadas en este equipo")
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE); stopSelf()
            return START_NOT_STICKY
        }
        if (intent?.action == Cfg.ACCION_PRUEBA) {
            h.postDelayed({ alarmar("prueba-local-" + System.currentTimeMillis(), "PRUEBA DE ESTA TABLETA", "Prueba local de la alarma (no es una falla real)", true) }, 10_000)
        }
        escuchar()
        Actualizacion.avisarSiHay(this)
        return START_STICKY
    }

    override fun onDestroy() { reg?.remove(); reg = null; super.onDestroy() }

    private fun escuchar() {
        if (reg != null) return
        val u = Cfg.auth(this).currentUser
        if (u == null) { estado("Sin cuenta: abre la aplicación y entra con tu nómina"); return }
        estado("Vigilando alarmas · nómina " + (u.email ?: "").substringBefore("@").substringBefore("."))
        reg = Cfg.db(this).collection("apps/paros/eventos").whereEqualTo("estado", "espera")
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    estado("⚠ Sin conexión con la base (" + (err.code.name) + "). Reintentando…")
                    reg?.remove(); reg = null
                    h.postDelayed({ escuchar() }, 30_000)
                    return@addSnapshotListener
                }
                val docs = snap?.documents ?: emptyList()
                estado(if (docs.isEmpty()) "Vigilando alarmas · sin fallas" else "⚠ " + docs.size + " falla(s) esperando técnico")
                val prefs = getSharedPreferences("vigia", MODE_PRIVATE)
                val vistos = (prefs.getStringSet("vistos", emptySet()) ?: emptySet()).toMutableSet()
                var nueva: com.google.firebase.firestore.DocumentSnapshot? = null
                for (d in docs) {
                    val clave = d.id + "|" + (d.getString("tAlerta") ?: d.getString("t0") ?: "")
                    if (clave !in vistos) { vistos.add(clave); nueva = d }
                }
                prefs.edit().putStringSet("vistos", vistos.toList().takeLast(300).toSet()).apply()
                if (docs.isEmpty()) sendBroadcast(Intent(Cfg.ACCION_FIN).setPackage(packageName))
                nueva?.let { d ->
                    val prueba = d.getBoolean("prueba") == true
                    val reab = (d.getLong("reab") ?: 0L) > 0
                    alarmar(
                        d.id, d.getString("maqN") ?: "Máquina",
                        if (reab) "La falla continúa: " + (d.getString("reabNota") ?: "") else (d.getString("falla") ?: ""),
                        prueba
                    )
                }
            }
    }

    private fun alarmar(id: String, maquina: String, falla: String, prueba: Boolean) {
        val i = Intent(this, AlarmaActivity::class.java)
            .putExtra("id", id).putExtra("maq", maquina).putExtra("falla", falla).putExtra("prueba", prueba)
            .putExtra("t0", System.currentTimeMillis())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pi = PendingIntent.getActivity(this, id.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(this, "alarmas")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle((if (prueba) "🧪 PRUEBA · " else "⚠ FALLA · ") + maquina)
            .setContentText(falla)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pi, true)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        getSystemService(NotificationManager::class.java).notify(id.hashCode(), n)
        // con permiso de "mostrar sobre otras aplicaciones" se abre directo, aunque la pantalla esté en otra app
        if (Settings.canDrawOverlays(this)) startActivity(i)
    }

    private fun fija(texto: String): Notification {
        val abrir = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, "vigia")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Alarmas Paros LI")
            .setContentText(texto)
            .setOngoing(true)
            .setContentIntent(abrir)
            .build()
    }

    private fun estado(texto: String) {
        getSharedPreferences("vigia", MODE_PRIVATE).edit().putString("estado", texto).apply()
        getSystemService(NotificationManager::class.java).notify(1, fija(texto))
        sendBroadcast(Intent(Cfg.ACCION_ESTADO).setPackage(packageName))
    }

    companion object {
        fun iniciar(ctx: Context, accion: String? = null) {
            ContextCompat.startForegroundService(ctx, Intent(ctx, VigiaService::class.java).setAction(accion))
        }

        fun canales(ctx: Context) {
            val nm = ctx.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(NotificationChannel("vigia", "Vigilancia (aviso fijo)", NotificationManager.IMPORTANCE_LOW))
            val c = NotificationChannel("alarmas", "Alarmas de falla", NotificationManager.IMPORTANCE_HIGH)
            c.setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
            )
            c.enableVibration(true)
            c.vibrationPattern = longArrayOf(0, 600, 300, 600, 300, 600)
            c.setBypassDnd(true)
            nm.createNotificationChannel(c)
        }
    }
}
