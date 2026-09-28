package com.example.data.update

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.example.domain.model.AppUpdateConfig
import java.util.concurrent.ConcurrentHashMap

/**
 * Gestor de frecuencia y cooldown para el modal de actualización.
 * Controla despliegues locales (ONCE, EACH_SESSION, COOLDOWN) sin generar lecturas extra en Firestore.
 */
class AppUpdateFrequencyManager(
    private val prefsName: String = "bluesystem_app_update_prefs"
) {
    companion object {
        private const val TAG = "AppUpdateFreqManager"
        private const val KEY_LAST_DISMISSED_TS = "last_dismissed_ts_"
        private const val KEY_DISMISSED_VERSION = "dismissed_version_"
        private const val KEY_DISMISSED_CAMPAIGN = "dismissed_campaign_"

        // Cache en memoria para control de sesión
        private val sessionDismissedCampaigns = ConcurrentHashMap.newKeySet<String>()
        private var sessionShownCount = 0
    }

    /**
     * Determina si el modal debe desplegarse respetando la frecuencia configurada.
     * REGLA CRÍTICA: Si [isForced] es true, la frecuencia e intervalos de cooldown se ignoran.
     */
    fun shouldShowModal(
        config: AppUpdateConfig,
        isForced: Boolean,
        context: Context,
        now: Long = System.currentTimeMillis()
    ): Boolean {
        // En modo forzado/obligatorio nunca se bloquea la presentación del modal
        if (isForced) {
            return true
        }

        val campaignKey = config.campaignId.ifBlank { config.latestVersion }

        // Si ya fue cerrado en esta sesión en memoria
        if (sessionDismissedCampaigns.contains(campaignKey)) {
            Log.d(TAG, "Modal suprimido: ya fue cerrado en esta sesión para campaña $campaignKey")
            return false
        }

        val prefs = getPrefs(context)

        return when (config.displayFrequency.trim().uppercase()) {
            "ONCE" -> {
                val alreadyShown = prefs.getBoolean(KEY_DISMISSED_CAMPAIGN + campaignKey, false)
                !alreadyShown
            }
            "COOLDOWN" -> {
                val lastDismissed = prefs.getLong(KEY_LAST_DISMISSED_TS + campaignKey, 0L)
                val cooldownMillis = config.cooldownHours.coerceAtLeast(1) * 3600L * 1000L
                val elapsed = now - lastDismissed
                elapsed >= cooldownMillis
            }
            "EACH_SESSION" -> {
                !sessionDismissedCampaigns.contains(campaignKey)
            }
            else -> {
                !sessionDismissedCampaigns.contains(campaignKey)
            }
        }
    }

    /**
     * Registra el descarte voluntario ("Más tarde") del modal.
     */
    fun recordDismissed(
        config: AppUpdateConfig,
        context: Context,
        now: Long = System.currentTimeMillis()
    ) {
        val campaignKey = config.campaignId.ifBlank { config.latestVersion }
        sessionDismissedCampaigns.add(campaignKey)

        val prefs = getPrefs(context)
        prefs.edit()
            .putLong(KEY_LAST_DISMISSED_TS + campaignKey, now)
            .putString(KEY_DISMISSED_VERSION + campaignKey, config.latestVersion)
            .putBoolean(KEY_DISMISSED_CAMPAIGN + campaignKey, true)
            .apply()

        Log.d(TAG, "Descarte registrado para campaña $campaignKey a las $now")
    }

    /**
     * Restablece el estado de sesión (útil para pruebas o reinicios).
     */
    fun resetSession() {
        sessionDismissedCampaigns.clear()
        sessionShownCount = 0
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    }
}
