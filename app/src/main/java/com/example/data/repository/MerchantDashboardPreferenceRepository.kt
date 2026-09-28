package com.example.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.example.domain.model.dashboard.*
import org.json.JSONArray
import org.json.JSONObject

/**
 * Repositorio de Preferencias Locales para la Personalización del Dashboard
 * Soporta Snapshots aislados por businessId y usuario (userId + businessId) y Perfiles de Layout.
 */
class MerchantDashboardPreferenceRepository(context: Context) {

    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences("merchant_dashboard_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_WIDGET_CONFIG_PREFIX = "widget_config_"
        private const val KEY_USER_SNAPSHOT_PREFIX = "user_snapshot_"
        private const val KEY_ACTIVE_PROFILE_PREFIX = "active_profile_"
        private const val KEY_DAILY_GOAL_TARGET_PREFIX = "daily_goal_target_"
    }

    private fun getWidgetConfigKey(businessId: String): String {
        return if (businessId.isNotBlank()) "$KEY_WIDGET_CONFIG_PREFIX$businessId" else "${KEY_WIDGET_CONFIG_PREFIX}default"
    }

    private fun getActiveProfileKey(businessId: String): String {
        return if (businessId.isNotBlank()) "$KEY_ACTIVE_PROFILE_PREFIX$businessId" else "${KEY_ACTIVE_PROFILE_PREFIX}default"
    }

    private fun getDailyGoalKey(businessId: String): String {
        return if (businessId.isNotBlank()) "$KEY_DAILY_GOAL_TARGET_PREFIX$businessId" else "${KEY_DAILY_GOAL_TARGET_PREFIX}default"
    }

    fun saveWidgetConfig(businessId: String, widgets: List<MerchantDashboardWidget>) {
        try {
            val array = JSONArray()
            widgets.forEach { w ->
                val obj = JSONObject().apply {
                    put("type", w.type.name)
                    put("title", w.title)
                    put("isVisible", w.isVisible)
                    put("isPinned", w.isPinned)
                    put("density", w.density.name)
                    put("order", w.order)
                }
                array.put(obj)
            }
            prefs.edit().putString(getWidgetConfigKey(businessId), array.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getWidgetConfig(businessId: String): List<MerchantDashboardWidget>? {
        val jsonStr = prefs.getString(getWidgetConfigKey(businessId), null) ?: return null
        return try {
            val array = JSONArray(jsonStr)
            val list = mutableListOf<MerchantDashboardWidget>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val typeName = obj.getString("type")
                val widgetType = try { WidgetType.valueOf(typeName) } catch (e: Exception) { null }
                if (widgetType != null) {
                    list.add(
                        MerchantDashboardWidget(
                            type = widgetType,
                            title = obj.optString("title", widgetType.name),
                            isVisible = obj.optBoolean("isVisible", true),
                            isPinned = obj.optBoolean("isPinned", false),
                            density = try { WidgetDensity.valueOf(obj.optString("density", "MEDIUM")) } catch (e: Exception) { WidgetDensity.MEDIUM },
                            order = obj.optInt("order", i)
                        )
                    )
                }
            }
            list
        } catch (e: Exception) {
            null
        }
    }

    fun saveActiveProfile(businessId: String, profileType: DashboardProfileType) {
        prefs.edit().putString(getActiveProfileKey(businessId), profileType.name).apply()
    }

    fun getActiveProfile(businessId: String): DashboardProfileType {
        val name = prefs.getString(getActiveProfileKey(businessId), DashboardProfileType.OPERATIONS.name) ?: DashboardProfileType.OPERATIONS.name
        return try { DashboardProfileType.valueOf(name) } catch (e: Exception) { DashboardProfileType.OPERATIONS }
    }

    fun saveDailyGoalTarget(businessId: String, target: Double) {
        prefs.edit().putFloat(getDailyGoalKey(businessId), target.toFloat()).apply()
    }

    fun getDailyGoalTarget(businessId: String): Double {
        return prefs.getFloat(getDailyGoalKey(businessId), 0.0f).toDouble()
    }

    fun saveUserSnapshot(userId: String, businessId: String, snapshot: DashboardSnapshot) {
        val key = "$KEY_USER_SNAPSHOT_PREFIX${userId}_$businessId"
        prefs.edit().putString(key, snapshot.activeProfile.name).apply()
        saveWidgetConfig(businessId, snapshot.widgetsConfig)
        saveDailyGoalTarget(businessId, snapshot.dailyGoalTarget)
    }
}
