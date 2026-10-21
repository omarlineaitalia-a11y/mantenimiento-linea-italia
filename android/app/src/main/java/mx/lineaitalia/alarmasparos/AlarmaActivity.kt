package mx.lineaitalia.alarmasparos

import android.app.Activity
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat

/** Alarma a pantalla completa: enciende la pantalla, suena como despertador y parpadea en rojo (morado si es prueba). */
class AlarmaActivity : Activity() {
    private var tono: Ringtone? = null
    private val h = Handler(Looper.getMainLooper())
    private lateinit var raiz: LinearLayout
    private lateinit var reloj: TextView
    private var t0 = 0L
    private var prueba = false
    private var on = true

    private val fin = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, i: Intent?) { finish() }
    }

    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true); setTurnScreenOn(true)
            getSystemService(KeyguardManager::class.java)?.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        raiz = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(48, 48, 48, 48) }
        setContentView(raiz)
        mostrar(intent)
        ContextCompat.registerReceiver(this, fin, IntentFilter(Cfg.ACCION_FIN), ContextCompat.RECEIVER_NOT_EXPORTED)
        sonar()
        h.post(object : Runnable {
            override fun run() {
                on = !on
                raiz.setBackgroundColor(if (prueba) (if (on) Color.rgb(91, 44, 131) else Color.rgb(46, 20, 70)) else (if (on) Color.rgb(198, 40, 40) else Color.rgb(122, 18, 18)))
                val s = (System.currentTimeMillis() - t0) / 1000
                reloj.text = "%d:%02d".format(s / 60, s % 60)
                h.postDelayed(this, 600)
            }
        })
    }

    override fun onNewIntent(i: Intent) { super.onNewIntent(i); mostrar(i) }

    private fun mostrar(i: Intent) {
        prueba = i.getBooleanExtra("prueba", false)
        t0 = i.getLongExtra("t0", System.currentTimeMillis())
        raiz.removeAllViews()
        fun texto(t: String, sp: Float, negrita: Boolean = true) = TextView(this).apply {
            text = t; textSize = sp; setTextColor(Color.WHITE); gravity = Gravity.CENTER
            if (negrita) setTypeface(typeface, Typeface.BOLD); setPadding(0, 12, 0, 12)
        }
        raiz.addView(texto(if (prueba) "🧪 PRUEBA DE ALARMA" else "⚠ FALLA EN MÁQUINA", 34f))
        raiz.addView(texto(i.getStringExtra("maq") ?: "", 44f))
        reloj = texto("0:00", 64f); raiz.addView(reloj)
        raiz.addView(texto(i.getStringExtra("falla") ?: "", 22f, false))
        raiz.addView(texto("El técnico registra \"Técnico en sitio\" con su nómina en la pantalla de la máquina.", 17f, false))
        val abrir = Button(this).apply {
            text = "ABRIR PAROS LI"; textSize = 20f
            // abre la pantalla de Control de Paros dentro de la app
            setOnClickListener { callar(); startActivity(Intent(this@AlarmaActivity, MainActivity::class.java).putExtra("pestana", "paros").addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)); finish() }
        }
        val silencio = Button(this).apply { text = "SILENCIAR"; textSize = 18f; setOnClickListener { callar() } }
        raiz.addView(abrir); raiz.addView(silencio)
    }

    private fun sonar() {
        try {
            tono = RingtoneManager.getRingtone(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))?.apply {
                audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
                if (Build.VERSION.SDK_INT >= 28) isLooping = true
                play()
            }
        } catch (_: Exception) { }
        try {
            @Suppress("DEPRECATION")
            (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 400), 0))
        } catch (_: Exception) { }
    }

    private fun callar() {
        try { tono?.stop() } catch (_: Exception) { }
        try { @Suppress("DEPRECATION") (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.cancel() } catch (_: Exception) { }
    }

    override fun onDestroy() {
        callar(); h.removeCallbacksAndMessages(null)
        try { unregisterReceiver(fin) } catch (_: Exception) { }
        super.onDestroy()
    }
}
