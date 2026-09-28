package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences

/**
 * Repositorio de Preferencias Locales para el RSC (Restaurant Settings Center)
 */
class RestaurantSettingsPreferenceRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("rsc_settings_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_WIZARD_COMPLETED = "setup_wizard_completed"
        private const val KEY_USER_THEME = "user_theme_preference"
    }

    fun isWizardCompleted(): Boolean {
        return prefs.getBoolean(KEY_WIZARD_COMPLETED, false)
    }

    fun setWizardCompleted(completed: Boolean) {
        prefs.edit().putBoolean(KEY_WIZARD_COMPLETED, completed).apply()
    }
}
