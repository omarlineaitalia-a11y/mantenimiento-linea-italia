package mx.lineaitalia.alarmasparos

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** Busca en GitHub si hay una versión nueva de la app (cada compilación publica "alarmas-paros-<número>"). */
object Actualizacion {
    const val DESCARGA = "https://github.com/omarlineaitalia-a11y/mantenimiento-linea-italia/releases/latest/download/AlarmasParosLI.apk"
    private const val API = "https://api.github.com/repos/omarlineaitalia-a11y/mantenimiento-linea-italia/releases/latest"

    /** Responde (en el hilo principal) con el número de la versión nueva, o null si ya está al día. */
    fun buscar(alTerminar: (Int?) -> Unit) {
        Thread {
            val nueva = try {
                val c = URL(API).openConnection() as HttpURLConnection
                c.connectTimeout = 10_000; c.readTimeout = 10_000
                c.setRequestProperty("Accept", "application/vnd.github+json")
                val tag = JSONObject(c.inputStream.bufferedReader().readText()).optString("tag_name")
                tag.substringAfterLast("-").toIntOrNull()?.takeIf { it > BuildConfig.VERSION_CODE }
            } catch (_: Exception) { null }
            Handler(Looper.getMainLooper()).post { alTerminar(nueva) }
        }.start()
    }

    fun descargar(ctx: Context) {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(DESCARGA)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Aviso en la barra de notificaciones (lo revisa el servicio una vez al día). */
    fun avisarSiHay(ctx: Context) {
        val p = ctx.getSharedPreferences("vigia", Context.MODE_PRIVATE)
        if (System.currentTimeMillis() - p.getLong("ultRevision", 0) < 12 * 3600_000L) return
        p.edit().putLong("ultRevision", System.currentTimeMillis()).apply()
        buscar { v ->
            if (v == null) return@buscar
            val pi = PendingIntent.getActivity(ctx, 7, Intent(ctx, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE)
            val n = NotificationCompat.Builder(ctx, "vigia")
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Hay una actualización de Alarmas Paros LI")
                .setContentText("Versión 1.$v · abre la app y toca ACTUALIZAR")
                .setContentIntent(pi).setAutoCancel(true).build()
            ctx.getSystemService(NotificationManager::class.java).notify(7, n)
        }
    }
}
