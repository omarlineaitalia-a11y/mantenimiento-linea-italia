package mx.lineaitalia.alarmasparos

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Al encender la tableta (o al actualizar la app) vuelve a arrancar la vigilancia. */
class ArranqueReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, i: Intent) {
        if (Cfg.auth(ctx).currentUser != null && Cfg.activo(ctx)) VigiaService.iniciar(ctx)
    }
}
