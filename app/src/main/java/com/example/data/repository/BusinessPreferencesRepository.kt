package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences

class BusinessPreferencesRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("business_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_MENU_DISPLAY_MODE = "menu_display_mode"
        private const val KEY_MENU_FILTER_CHIP = "menu_filter_chip"
    }

    fun getMenuDisplayMode(defaultMode: String = "CATEGORIES"): String {
        return prefs.getString(KEY_MENU_DISPLAY_MODE, defaultMode) ?: defaultMode
    }

    fun saveMenuDisplayMode(mode: String) {
        prefs.edit().putString(KEY_MENU_DISPLAY_MODE, mode).apply()
    }

    fun getMenuFilterChip(defaultFilter: String = "ALL"): String {
        return prefs.getString(KEY_MENU_FILTER_CHIP, defaultFilter) ?: defaultFilter
    }

    fun saveMenuFilterChip(filter: String) {
        prefs.edit().putString(KEY_MENU_FILTER_CHIP, filter).apply()
    }
}
