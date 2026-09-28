package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences

/**
 * Repositorio de Preferencias Locales para la Consola MOOC
 * Guarda las opciones de visualización (Kanban vs Lista), filtros activos y feature flags.
 */
class MerchantOrdersPreferenceRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("mooc_orders_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_VIEW_MODE = "mooc_view_mode" // "KANBAN" o "LIST"
        private const val KEY_SMART_ASSIGNMENT = "enable_smart_assignment"
    }

    fun saveViewMode(isKanban: Boolean) {
        prefs.edit().putString(KEY_VIEW_MODE, if (isKanban) "KANBAN" else "LIST").apply()
    }

    fun isKanbanViewMode(): Boolean {
        return prefs.getString(KEY_VIEW_MODE, "KANBAN") == "KANBAN"
    }

    fun saveSmartAssignmentEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_SMART_ASSIGNMENT, enabled).apply()
    }

    fun isSmartAssignmentEnabled(): Boolean {
        return prefs.getBoolean(KEY_SMART_ASSIGNMENT, true)
    }
}
