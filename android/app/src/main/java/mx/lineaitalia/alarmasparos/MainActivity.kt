package mx.lineaitalia.alarmasparos

import android.Manifest
import android.annotation.SuppressLint
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
import android.view.View
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.firestore.FirebaseFirestoreException

/**
 * Pantalla principal: Control de Paros (la página de siempre) dentro de la app.
 * Pestaña "Activación de alarmas": activar con nómina + contraseña genérica, encender/apagar alarmas, permisos y prueba.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private lateinit var ajustes: ScrollView
    private lateinit var tabParos: Button
    private lateinit var tabAlarmas: Button
    private lateinit var estado: TextView
    private lateinit var permisos: TextView
    private lateinit var msg: TextView
    private lateinit var nom: EditText
    private lateinit var pw: EditText
    private lateinit var cajaEntrar: LinearLayout
    private lateinit var interruptor: Button
    private lateinit var actualizar: Button
    private var fuera = 0L // cuándo se dejó de ver la app (para recargar Control de Paros al volver)

    private val verde = Color.rgb(30, 74, 42)
    private val rcv = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { refrescar() }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        VigiaService.canales(this)

        // ---- pestañas
        tabParos = pestanaBoton("CONTROL DE PAROS") { mostrar(true) }
        tabAlarmas = pestanaBoton("ACTIVACIÓN DE ALARMAS") { mostrar(false) }
        val tabRecargar = pestanaBoton("🔄 RECARGAR") { mostrar(true); recargarParos() }
        val barra = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL; setBackgroundColor(verde)
            addView(tabParos, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(tabAlarmas, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            addView(tabRecargar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }

        // ---- Control de Paros (la página de siempre)
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                    val u = r.url.toString()
                    if (u.startsWith("https://omarlineaitalia-a11y.github.io/")) return false
                    try { startActivity(Intent(Intent.ACTION_VIEW, r.url)) } catch (_: Exception) { }
                    return true
                }
            }
            loadUrl(Cfg.URL_PAROS)
        }

        // ---- Activación de alarmas
        ajustes = ScrollView(this).apply { addView(armarAjustes()) }

        val contenido = FrameLayout(this).apply {
            addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            addView(ajustes, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(barra)
            addView(contenido, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        })

        // sin alarmas activadas se abre primero la pestaña de activación
        mostrar(Cfg.auth(this).currentUser != null && intent?.getStringExtra("pestana") != "alarmas")
        if (Cfg.auth(this).currentUser != null && Cfg.activo(this)) VigiaService.iniciar(this)
    }

    override fun onNewIntent(i: Intent) {
        super.onNewIntent(i)
        if (i.getStringExtra("pestana") == "paros") { mostrar(true); web.reload() }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.visibility == View.VISIBLE && web.canGoBack()) web.goBack()
        else if (web.visibility != View.VISIBLE) mostrar(true)
        else super.onBackPressed()
    }

    // baja la versión más reciente de Control de Paros (sin copias guardadas), para que los cambios publicados lleguen sin "Forzar detención"
    private fun recargarParos() {
        web.clearCache(true)
        web.loadUrl(Cfg.URL_PAROS + "?r=" + System.currentTimeMillis())
    }

    private fun pestanaBoton(t: String, f: () -> Unit) = Button(this).apply {
        text = t; textSize = 13f; setTextColor(Color.WHITE); setBackgroundColor(Color.TRANSPARENT); setOnClickListener { f() }
    }

    private fun mostrar(paros: Boolean) {
        web.visibility = if (paros) View.VISIBLE else View.GONE
        ajustes.visibility = if (paros) View.GONE else View.VISIBLE
        tabParos.setBackgroundColor(if (paros) Color.rgb(46, 125, 50) else Color.TRANSPARENT)
        tabAlarmas.setBackgroundColor(if (!paros) Color.rgb(46, 125, 50) else Color.TRANSPARENT)
        if (!paros) refrescar()
    }

    private fun armarAjustes(): LinearLayout {
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(40, 32, 40, 48) }
        fun t(s: String, sp: Float = 15f, bold: Boolean = false, color: Int = Color.rgb(28, 38, 32)) = TextView(this).apply {
            text = s; textSize = sp; setTextColor(color); setPadding(0, 10, 0, 10); if (bold) setTypeface(typeface, Typeface.BOLD)
        }
        fun boton(s: String, f: () -> Unit) = Button(this).apply { text = s; setOnClickListener { f() } }

        col.addView(t("Activación de alarmas", 24f, true, verde))
        col.addView(t("Versión " + BuildConfig.VERSION_NAME + ". Cuando hay una falla, este equipo enciende la pantalla y abre la alarma a pantalla completa, aunque la app esté cerrada."))
        actualizar = boton("") { Actualizacion.descargar(this) }.apply { visibility = View.GONE; setBackgroundColor(Color.rgb(201, 151, 0)) }
        col.addView(actualizar)
        estado = t("", 17f, true); col.addView(estado)

        // activar con nómina + contraseña genérica
        cajaEntrar = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        cajaEntrar.addView(t("Activar alarmas en este equipo", 16f, true))
        cajaEntrar.addView(t("Escribe tu número de nómina y tu contraseña (las mismas de Control de Paros)."))
        nom = EditText(this).apply { hint = "Número de nómina"; inputType = InputType.TYPE_CLASS_NUMBER }
        pw = EditText(this).apply { hint = "Contraseña"; inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        cajaEntrar.addView(nom); cajaEntrar.addView(pw)
        cajaEntrar.addView(boton("ACTIVAR ALARMAS") { entrar() })
        col.addView(cajaEntrar)
        msg = t(""); col.addView(msg)

        // encender / apagar alarmas (personal que no está laborando)
        interruptor = Button(this).apply { textSize = 17f; setTextColor(Color.WHITE); setPadding(20, 30, 20, 30); setOnClickListener { cambiarActivo() } }
        col.addView(interruptor)

        col.addView(t("Permisos (todos con ✔)", 16f, true))
        permisos = t(""); col.addView(permisos)
        col.addView(boton("Mostrar sobre otras aplicaciones") { abrir(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) })
        if (Build.VERSION.SDK_INT >= 34) col.addView(boton("Alarmas a pantalla completa") { abrir(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName"))) })
        col.addView(boton("Batería sin restricciones") {
            @Suppress("BatteryLife")
            abrir(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        })

        col.addView(t("Probar", 16f, true))
        col.addView(boton("PROBAR ALARMA EN 10 SEGUNDOS") {
            VigiaService.iniciar(this, Cfg.ACCION_PRUEBA)
            msg.text = "La alarma de prueba suena en 10 segundos: sal a la pantalla de inicio o apaga la pantalla."
        })
        col.addView(boton("Cambiar de nómina en este equipo") {
            stopService(Intent(this, VigiaService::class.java)); Cfg.auth(this).signOut()
            getSharedPreferences("vigia", MODE_PRIVATE).edit().putString("estado", "Sin activar").apply(); refrescar()
        })
        return col
    }

    override fun onResume() {
        super.onResume()
        ContextCompat.registerReceiver(this, rcv, IntentFilter(Cfg.ACCION_ESTADO), ContextCompat.RECEIVER_NOT_EXPORTED)
        refrescar()
        // al volver después de más de 5 minutos fuera, recarga Control de Paros para tomar la versión publicada
        if (fuera > 0 && System.currentTimeMillis() - fuera > 5 * 60_000L) recargarParos()
        fuera = 0L
        Actualizacion.buscar { v ->
            actualizar.visibility = if (v == null) View.GONE else View.VISIBLE
            if (v != null) actualizar.text = "⬆ ACTUALIZAR A LA VERSIÓN 1.$v (se instala encima, sin borrar nada)"
        }
    }

    override fun onPause() { fuera = System.currentTimeMillis(); try { unregisterReceiver(rcv) } catch (_: Exception) { }; super.onPause() }

    private fun abrir(i: Intent) { try { startActivity(i) } catch (_: Exception) { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } }

    private fun notifOk() = getSystemService(NotificationManager::class.java).areNotificationsEnabled()

    private fun refrescar() {
        if (!::estado.isInitialized) return
        val u = Cfg.auth(this).currentUser
        val nomina = (u?.email ?: "").substringBefore("@").substringBefore(".")
        val act = Cfg.activo(this)
        val e = getSharedPreferences("vigia", MODE_PRIVATE).getString("estado", "") ?: ""
        cajaEntrar.visibility = if (u == null) View.VISIBLE else View.GONE
        interruptor.visibility = if (u == null) View.GONE else View.VISIBLE
        estado.text = when {
            u == null -> "⛔ Alarmas sin activar en este equipo"
            !act -> "🔕 Alarmas DESACTIVADAS · nómina $nomina"
            else -> "✔ " + e
        }
        estado.setTextColor(if (u != null && act) Color.rgb(46, 125, 50) else Color.rgb(198, 40, 40))
        interruptor.text = if (act && notifOk()) "🔔 ALARMAS ACTIVADAS\n(tocar para desactivar: personal que no está laborando)" else "🔕 ALARMAS DESACTIVADAS\n(tocar para activar)"
        interruptor.setBackgroundColor(if (act && notifOk()) Color.rgb(46, 125, 50) else Color.rgb(198, 40, 40))
        val nm = getSystemService(NotificationManager::class.java)
        val pm = getSystemService(PowerManager::class.java)
        fun ok(b: Boolean) = if (b) "✔" else "✖"
        permisos.text = ok(notifOk()) + " Notificaciones\n" +
            ok(Settings.canDrawOverlays(this)) + " Mostrar sobre otras aplicaciones\n" +
            (if (Build.VERSION.SDK_INT >= 34) ok(nm.canUseFullScreenIntent()) + " Alarmas a pantalla completa\n" else "") +
            ok(pm.isIgnoringBatteryOptimizations(packageName)) + " Batería sin restricciones"
    }

    /** Botón de activar / desactivar alarmas (también pide el permiso de notificaciones si falta). */
    private fun cambiarActivo() {
        val activar = !(Cfg.activo(this) && notifOk())
        if (activar) {
            if (!notifOk()) {
                if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
                else abrir(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, packageName))
            }
            Cfg.ponerActivo(this, true); VigiaService.iniciar(this)
            msg.text = "Alarmas ACTIVADAS en este equipo."
        } else {
            Cfg.ponerActivo(this, false); stopService(Intent(this, VigiaService::class.java))
            getSharedPreferences("vigia", MODE_PRIVATE).edit().putString("estado", "Alarmas desactivadas").apply()
            msg.text = "Alarmas DESACTIVADAS en este equipo. Vuelve a activarlas al regresar al turno."
        }
        refrescar()
    }

    override fun onRequestPermissionsResult(rc: Int, p: Array<out String>, r: IntArray) { super.onRequestPermissionsResult(rc, p, r); refrescar() }

    private fun entrar() {
        val n = nom.text.toString().trim(); val p = pw.text.toString()
        if (n.isEmpty() || p.isEmpty()) { msg.text = "Escribe tu número de nómina y tu contraseña."; return }
        msg.text = "Activando…"
        val auth = Cfg.auth(this)
        // cuenta real de la persona (si un administrador le restableció la contraseña, la cuenta lleva versión)
        Cfg.correoActual(this, n).continueWithTask { auth.signInWithEmailAndPassword(it.result, p) }
            // comprobar que la nómina está dada de alta y activa en Control de Paros
            .continueWithTask { t -> if (!t.isSuccessful) throw t.exception!!; Cfg.db(this).document("apps/paros/config/personal").get() }
            .addOnSuccessListener { s ->
                pw.setText("")
                val per = (s.get("p") as? Map<*, *>)?.get(n) as? Map<*, *>
                if (per == null || per["a"] == false) { msg.text = "La nómina $n no está dada de alta (o está inactiva) en Control de Paros."; auth.signOut(); refrescar(); return@addOnSuccessListener }
                Cfg.ponerActivo(this, true)
                getSharedPreferences("vigia", MODE_PRIVATE).edit().putString("nomina", n).apply()
                msg.text = "Listo: alarmas activadas para " + (per["n"] ?: n) + "."
                if (!notifOk() && Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
                VigiaService.iniciar(this); refrescar()
            }
            .addOnFailureListener { ex ->
                msg.text = when {
                    ex is FirebaseFirestoreException && ex.code == FirebaseFirestoreException.Code.PERMISSION_DENIED -> "La nómina $n no tiene acceso a Control de Paros."
                    ex is FirebaseAuthInvalidCredentialsException || ex is FirebaseAuthInvalidUserException -> "Nómina o contraseña incorrecta. Si no tienes cuenta o la olvidaste, pídela a un administrador."
                    else -> "No se pudo activar: " + (ex.message ?: "")
                }
                auth.signOut(); refrescar()
            }
    }
}
