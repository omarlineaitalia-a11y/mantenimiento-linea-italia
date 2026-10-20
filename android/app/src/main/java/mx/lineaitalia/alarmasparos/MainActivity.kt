package mx.lineaitalia.alarmasparos

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat

/** Pantalla de configuración: entrar con nómina, dar permisos, probar la alarma. */
class MainActivity : Activity() {
    private lateinit var estado: TextView
    private lateinit var permisos: TextView
    private lateinit var msg: TextView
    private lateinit var nom: EditText
    private lateinit var pw: EditText
    private lateinit var actualizar: Button

    private val rcv = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { refrescar() }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        VigiaService.canales(this)
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(40, 48, 40, 48) }
        fun t(s: String, sp: Float = 15f, bold: Boolean = false, color: Int = Color.rgb(28, 38, 32)) = TextView(this).apply {
            text = s; textSize = sp; setTextColor(color); setPadding(0, 10, 0, 10); if (bold) setTypeface(typeface, Typeface.BOLD)
        }
        fun boton(s: String, f: () -> Unit) = Button(this).apply { text = s; setOnClickListener { f() } }

        col.addView(t("Alarmas Paros LI", 26f, true, Color.rgb(30, 74, 42)))
        col.addView(t("Mantenimiento Línea Italia · versión " + BuildConfig.VERSION_NAME + ". Vigila las fallas de Control de Paros y abre la alarma a pantalla completa aunque el navegador esté cerrado."))
        actualizar = boton("") { Actualizacion.descargar(this) }.apply { visibility = android.view.View.GONE; setBackgroundColor(Color.rgb(201, 151, 0)) }
        col.addView(actualizar)
        estado = t("", 17f, true); col.addView(estado)

        col.addView(t("1 · Entra con tu cuenta (personal de mantenimiento)", 16f, true))
        nom = EditText(this).apply { hint = "Número de nómina"; inputType = InputType.TYPE_CLASS_NUMBER }
        pw = EditText(this).apply { hint = "Contraseña"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        col.addView(nom); col.addView(pw)
        col.addView(boton("ENTRAR Y ACTIVAR VIGILANCIA") { entrar() })
        msg = t(""); col.addView(msg)

        col.addView(t("2 · Permisos (toca cada uno y actívalo)", 16f, true))
        permisos = t(""); col.addView(permisos)
        col.addView(boton("Permitir notificaciones") {
            if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
            else abrir(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
        })
        col.addView(boton("Mostrar sobre otras aplicaciones") { abrir(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) })
        if (Build.VERSION.SDK_INT >= 34) col.addView(boton("Alarmas a pantalla completa") { abrir(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName"))) })
        col.addView(boton("Batería sin restricciones") {
            @Suppress("BatteryLife")
            abrir(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        })

        col.addView(t("3 · Probar", 16f, true))
        col.addView(boton("PROBAR ALARMA EN 10 SEGUNDOS") {
            VigiaService.iniciar(this, Cfg.ACCION_PRUEBA)
            msg.text = "La alarma de prueba suena en 10 segundos: sal a la pantalla de inicio o apaga la pantalla."
        })
        col.addView(t("Para probar toda la cadena: en Control de Paros, un administrador lanza 🧪 PRUEBA DE ALARMA."))
        col.addView(boton("Abrir Control de Paros") { abrir(Intent(Intent.ACTION_VIEW, Uri.parse(Cfg.URL_PAROS))) })
        col.addView(boton("Cerrar sesión de esta tableta") {
            stopService(Intent(this, VigiaService::class.java)); Cfg.auth(this).signOut()
            getSharedPreferences("vigia", MODE_PRIVATE).edit().putString("estado", "Sin cuenta").apply(); refrescar()
        })
        setContentView(ScrollView(this).apply { addView(col) })
        if (Cfg.auth(this).currentUser != null) VigiaService.iniciar(this)
    }

    override fun onResume() {
        super.onResume()
        ContextCompat.registerReceiver(this, rcv, IntentFilter(Cfg.ACCION_ESTADO), ContextCompat.RECEIVER_NOT_EXPORTED)
        refrescar()
        Actualizacion.buscar { v ->
            actualizar.visibility = if (v == null) android.view.View.GONE else android.view.View.VISIBLE
            if (v != null) actualizar.text = "⬆ ACTUALIZAR A LA VERSIÓN 1.$v (se instala encima, sin borrar nada)"
        }
    }

    override fun onPause() { try { unregisterReceiver(rcv) } catch (_: Exception) { }; super.onPause() }

    private fun abrir(i: Intent) { try { startActivity(i) } catch (_: Exception) { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } }

    private fun refrescar() {
        val u = Cfg.auth(this).currentUser
        val e = getSharedPreferences("vigia", MODE_PRIVATE).getString("estado", "") ?: ""
        estado.text = if (u == null) "⛔ Sin cuenta: entra con tu nómina" else "✔ " + e
        estado.setTextColor(if (u == null) Color.rgb(198, 40, 40) else Color.rgb(46, 125, 50))
        val nm = getSystemService(NotificationManager::class.java)
        val pm = getSystemService(PowerManager::class.java)
        fun ok(b: Boolean) = if (b) "✔" else "✖"
        permisos.text = ok(nm.areNotificationsEnabled()) + " Notificaciones\n" +
            ok(Settings.canDrawOverlays(this)) + " Mostrar sobre otras aplicaciones\n" +
            (if (Build.VERSION.SDK_INT >= 34) ok(nm.canUseFullScreenIntent()) + " Alarmas a pantalla completa\n" else "") +
            ok(pm.isIgnoringBatteryOptimizations(packageName)) + " Batería sin restricciones"
    }

    private fun entrar() {
        val n = nom.text.toString().trim(); val p = pw.text.toString()
        if (n.isEmpty() || p.isEmpty()) { msg.text = "Escribe tu nómina y tu contraseña."; return }
        msg.text = "Entrando…"
        Cfg.correoActual(this, n).continueWithTask { Cfg.auth(this).signInWithEmailAndPassword(it.result, p) }
            .continueWithTask { t -> if (!t.isSuccessful) throw t.exception!!; Cfg.db(this).document("apps/paros/config/personal").get() }
            .addOnSuccessListener { s ->
                val per = (s.get("p") as? Map<*, *>)?.get(n) as? Map<*, *>
                pw.setText("")
                if (per == null) { msg.text = "Tu nómina no está en el personal de Control de Paros."; return@addOnSuccessListener }
                msg.text = "Bienvenido(a), " + (per["n"] ?: n) + ". La vigilancia quedó activa."
                VigiaService.iniciar(this); refrescar()
            }
            .addOnFailureListener { ex ->
                val m = ex.message ?: ""
                msg.text = if ("credential" in m || "password" in m || "no user" in m) "Nómina o contraseña incorrecta." else if ("PERMISSION" in m.uppercase()) "Tu nómina no tiene acceso a Control de Paros." else "No se pudo entrar: $m"
                Cfg.auth(this).signOut(); refrescar()
            }
    }
}
