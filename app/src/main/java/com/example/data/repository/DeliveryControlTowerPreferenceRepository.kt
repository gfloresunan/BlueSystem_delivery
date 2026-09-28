package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences

/**
 * Repositorio de Preferencias Locales para la Torre de Control (DCT)
 */
class DeliveryControlTowerPreferenceRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("dct_control_tower_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ENABLE_FLEET_MAP = "enable_fleet_map"
        private const val KEY_ENABLE_SMART_ASSIGNMENT = "enable_smart_assignment"
    }

    fun saveFleetMapEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_ENABLE_FLEET_MAP, enabled).apply()
    }

    fun isFleetMapEnabled(): Boolean {
        return prefs.getBoolean(KEY_ENABLE_FLEET_MAP, true)
    }
}
