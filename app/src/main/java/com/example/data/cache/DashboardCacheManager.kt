package com.example.data.cache

import android.content.Context
import android.content.SharedPreferences
import com.example.DashboardConfig
import org.json.JSONArray
import org.json.JSONObject

object DashboardCacheManager {

    private const val PREF_NAME = "bluesystem_dashboard_cache"
    private const val KEY_CONFIG = "cached_dashboard_config"
    private const val KEY_TIMESTAMP = "cached_timestamp"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Guarda la configuración del Dashboard en la memoria caché local usando JSONObject.
     */
    fun saveConfig(context: Context, config: DashboardConfig) {
        try {
            val sectionOrderArray = JSONArray().apply {
                config.sectionOrder.forEach { put(it) }
            }
            val json = JSONObject().apply {
                put("showBanners", config.showBanners)
                put("showCategories", config.showCategories)
                put("showBranchesBlock", config.showBranchesBlock)
                put("showFeaturedBusinesses", config.showFeaturedBusinesses)
                put("showFeaturedProducts", config.showFeaturedProducts)
                put("showPromotions", config.showPromotions)
                put("showSamePrice", config.showSamePrice)
                put("showFlashDeals", config.showFlashDeals)
                put("showTopSelling", config.showTopSelling)
                put("showRecommended", config.showRecommended)
                put("showNewBusinesses", config.showNewBusinesses)
                put("showQuickReorder", config.showQuickReorder)
                put("showFavoritesBlock", config.showFavoritesBlock)
                put("showNearbyBusinesses", config.showNearbyBusinesses)
                put("nearbyInitialRadiusKm", config.nearbyInitialRadiusKm)
                put("nearbySecondaryRadiusKm", config.nearbySecondaryRadiusKm)
                put("nearbyMaxRadiusKm", config.nearbyMaxRadiusKm)
                put("nearbyMinimumMerchantCount", config.nearbyMinimumMerchantCount)
                put("nearbyAutoExpandEnabled", config.nearbyAutoExpandEnabled)
                put("nearbyOrdering", config.nearbyOrdering)
                put("sectionOrder", sectionOrderArray)
            }.toString()

            getPrefs(context).edit()
                .putString(KEY_CONFIG, json)
                .putLong(KEY_TIMESTAMP, System.currentTimeMillis())
                .apply()
        } catch (e: Exception) {
            android.util.Log.e("DashboardCacheManager", "Error saving cached config", e)
        }
    }

    /**
     * Carga la configuración del Dashboard desde la memoria caché local.
     */
    fun loadCachedConfig(context: Context): DashboardConfig {
        return try {
            val str = getPrefs(context).getString(KEY_CONFIG, null)
            if (str != null) {
                val json = JSONObject(str)
                val sectionOrderList = mutableListOf<String>()
                val orderArray = json.optJSONArray("sectionOrder")
                if (orderArray != null) {
                    for (i in 0 until orderArray.length()) {
                        val item = orderArray.optString(i)
                        if (!item.isNullOrBlank()) {
                            sectionOrderList.add(item)
                        }
                    }
                }
                DashboardConfig(
                    showBanners = json.optBoolean("showBanners", true),
                    showCategories = json.optBoolean("showCategories", true),
                    showBranchesBlock = json.optBoolean("showBranchesBlock", true),
                    showFeaturedBusinesses = json.optBoolean("showFeaturedBusinesses", true),
                    showFeaturedProducts = json.optBoolean("showFeaturedProducts", true),
                    showPromotions = json.optBoolean("showPromotions", true),
                    showSamePrice = json.optBoolean("showSamePrice", true),
                    showFlashDeals = json.optBoolean("showFlashDeals", true),
                    showTopSelling = json.optBoolean("showTopSelling", true),
                    showRecommended = json.optBoolean("showRecommended", true),
                    showNewBusinesses = json.optBoolean("showNewBusinesses", true),
                    showQuickReorder = json.optBoolean("showQuickReorder", true),
                    showFavoritesBlock = json.optBoolean("showFavoritesBlock", true),
                    showNearbyBusinesses = json.optBoolean("showNearbyBusinesses", true),
                    nearbyInitialRadiusKm = json.optDouble("nearbyInitialRadiusKm", 5.0),
                    nearbySecondaryRadiusKm = json.optDouble("nearbySecondaryRadiusKm", 10.0),
                    nearbyMaxRadiusKm = json.optDouble("nearbyMaxRadiusKm", 15.0),
                    nearbyMinimumMerchantCount = json.optInt("nearbyMinimumMerchantCount", 5),
                    nearbyAutoExpandEnabled = json.optBoolean("nearbyAutoExpandEnabled", true),
                    nearbyOrdering = json.optString("nearbyOrdering", "nearest"),
                    sectionOrder = if (sectionOrderList.isNotEmpty()) sectionOrderList else DashboardConfig.CANONICAL_DEFAULT_SECTION_ORDER
                )
            } else {
                DashboardConfig()
            }
        } catch (e: Exception) {
            DashboardConfig()
        }
    }
}
