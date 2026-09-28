package com.example.presentation.customer.profile

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class AppThemeMode { SYSTEM, DARK, LIGHT }

object ProfileThemeManager {
    private const val PREFS_NAME = "customer_preferences_prefs"
    private const val KEY_THEME_MODE = "app_theme_mode"

    private var sharedPreferences: SharedPreferences? = null

    private val _currentTheme = MutableStateFlow(AppThemeMode.SYSTEM)
    val currentTheme: StateFlow<AppThemeMode> = _currentTheme.asStateFlow()

    fun init(context: Context) {
        if (sharedPreferences == null) {
            sharedPreferences = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val savedThemeStr = sharedPreferences?.getString(KEY_THEME_MODE, AppThemeMode.SYSTEM.name) ?: AppThemeMode.SYSTEM.name

            _currentTheme.value = try {
                AppThemeMode.valueOf(savedThemeStr.uppercase())
            } catch (e: Exception) {
                AppThemeMode.SYSTEM
            }
        }
    }

    fun setTheme(mode: AppThemeMode, context: Context? = null) {
        _currentTheme.value = mode
        val prefs = sharedPreferences ?: context?.applicationContext?.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs?.edit()?.putString(KEY_THEME_MODE, mode.name)?.apply()
    }
}
