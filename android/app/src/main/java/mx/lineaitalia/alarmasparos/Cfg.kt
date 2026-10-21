package mx.lineaitalia.alarmasparos

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import java.security.MessageDigest

/** Datos del proyecto de Firebase de Mantenimiento Línea Italia (los mismos que usa la página web). */
object Cfg {
    const val URL_PAROS = "https://omarlineaitalia-a11y.github.io/mantenimiento-linea-italia/paros/"
    const val DOMINIO = "mtto-lineaitalia.app"
    const val ACCION_FIN = "mx.lineaitalia.alarmasparos.FIN_ALARMA"
    const val ACCION_PRUEBA = "mx.lineaitalia.alarmasparos.PRUEBA_LOCAL"
    const val ACCION_ESTADO = "mx.lineaitalia.alarmasparos.ESTADO"
    fun activo(ctx: Context) = ctx.getSharedPreferences("vigia", Context.MODE_PRIVATE).getBoolean("activo", true)
    fun ponerActivo(ctx: Context, v: Boolean) = ctx.getSharedPreferences("vigia", Context.MODE_PRIVATE).edit().putBoolean("activo", v).apply()

    fun app(ctx: Context): FirebaseApp =
        FirebaseApp.getApps(ctx).firstOrNull() ?: FirebaseApp.initializeApp(
            ctx.applicationContext,
            FirebaseOptions.Builder()
                .setApiKey("AIzaSyAwYUJeUCrgdXJJrjlK_E9uYJ8x8ZpoUus")
                .setApplicationId("1:860470537913:web:eadf69f7fe711b3273b568")
                .setProjectId("master-general-bf6aa")
                .setStorageBucket("master-general-bf6aa.firebasestorage.app")
                .setGcmSenderId("860470537913")
                .build()
        )

    fun auth(ctx: Context): FirebaseAuth = FirebaseAuth.getInstance(app(ctx))
    fun db(ctx: Context): FirebaseFirestore = FirebaseFirestore.getInstance(app(ctx))

    /** Igual que la página: huella SHA-256 de 'li-mtto:'+nómina, primeros 24 caracteres. */
    fun huella(nomina: String): String =
        MessageDigest.getInstance("SHA-256").digest(("li-mtto:" + nomina.trim()).toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }.take(24)

    /** Correo de la cuenta vigente (si un administrador restableció la contraseña, lleva versión). */
    fun correoActual(ctx: Context, nomina: String): Task<String> =
        db(ctx).document("acceso/publico").get().continueWith { t ->
            val v = if (t.isSuccessful) ((t.result?.get("m") as? Map<*, *>)?.get(huella(nomina)) as? Number)?.toInt() ?: 0 else 0
            val n = nomina.trim()
            (if (v > 0) "$n.$v" else n) + "@" + DOMINIO
        }
}
