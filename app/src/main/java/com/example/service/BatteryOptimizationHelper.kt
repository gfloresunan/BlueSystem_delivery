package com.example.service

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log

/**
 * BatteryOptimizationHelper
 *
 * Gestiona la solicitud de exención de optimización de batería del fabricante.
 *
 * **Por qué es necesario:**
 * En Android stock, FCM con priority:"high" garantiza entrega incluso en Doze Mode.
 * Sin embargo, fabricantes como Xiaomi (MIUI), Huawei (EMUI) y Samsung (One UI) aplican
 * capas de optimización propias que pueden bloquear FCM aunque Android lo permita.
 * La única solución confiable es solicitar al usuario la exención explícita.
 *
 * **Cuándo invocar:**
 * Llamar a [requestExemptionIfNeeded] una sola vez, en el primer login del rol Comercio
 * o Motorizado (nunca para clientes). Guardar el flag en SharedPreferences para no
 * repetir la solicitud en cada sesión.
 */
object BatteryOptimizationHelper {

    private const val PREF_KEY = "battery_exemption_requested"
    private const val PREFS_NAME = "bluesystem_prefs"
    private const val TAG = "BatteryHelper"

    /**
     * Verifica si la app ya está exenta de la optimización de batería.
     * @return true si la app ya está en la lista blanca del sistema.
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    /**
     * Solicita la exención de optimización de batería si aún no ha sido otorgada.
     * Muestra el diálogo del sistema solo si no se ha solicitado previamente.
     *
     * @param context Contexto de actividad (necesario para startActivity).
     * @param forceShow Si es true, muestra el diálogo incluso si ya fue solicitado antes.
     */
    fun requestExemptionIfNeeded(context: Context, forceShow: Boolean = false) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val alreadyRequested = prefs.getBoolean(PREF_KEY, false)

        if (isIgnoringBatteryOptimizations(context)) {
            Log.d(TAG, "App ya está exenta de optimización de batería.")
            return
        }

        if (alreadyRequested && !forceShow) {
            Log.d(TAG, "Exención ya fue solicitada previamente. No se repite.")
            return
        }

        try {
            // ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS abre el diálogo del sistema
            // que le explica al usuario por qué necesita este permiso.
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            prefs.edit().putBoolean(PREF_KEY, true).apply()
            Log.i(TAG, "Solicitud de exención de batería enviada al usuario.")
        } catch (e: Exception) {
            // Fallback: si el Intent no está disponible en el dispositivo (algunos fabricantes
            // no lo implementan), redirigir a la pantalla general de configuración de la app.
            Log.w(TAG, "ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS no disponible. Fallback a App Settings.", e)
            try {
                val fallbackIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${context.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(fallbackIntent)
            } catch (fallbackEx: Exception) {
                Log.e(TAG, "No se pudo abrir configuración de la app.", fallbackEx)
            }
        }
    }
}
