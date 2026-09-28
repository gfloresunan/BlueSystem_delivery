package com.example.enterprise.featureflags

import com.example.data.mapper.menu.CanonicalJsonChecksumHelper

enum class FlagScope {
    GLOBAL,
    TENANT,
    SEGMENT,
    ROLLOUT,
    DEVICE,
    USER
}

data class FeatureFlag(
    val key: String,
    val isEnabled: Boolean = true,
    val scope: FlagScope = FlagScope.GLOBAL,
    val rolloutPercentage: Int = 100, // 0 to 100
    val isKillSwitchActive: Boolean = false,
    val owner: String = "Architecture Team",
    val description: String = "",
    val expirationTimestamp: Long? = null
)

/**
 * Servidor Enterprise: FeatureFlagEngine (Pilar 4).
 * Evaluación de banderas de función ultrarrápida (<1ms en L1), rollout gradual determinista y kill switch.
 */
class FeatureFlagEngine {

    private val l1Cache = mutableMapOf<String, Boolean>()
    private val flagRegistry = mutableMapOf<String, FeatureFlag>()

    fun registerFlag(flag: FeatureFlag) {
        flagRegistry[flag.key] = flag
        l1Cache.clear() // Invalida L1 al registrar nueva bandera
    }

    fun isFeatureEnabled(
        flagKey: String,
        tenantId: String? = null,
        userId: String? = null,
        currentTimeMillis: Long = System.currentTimeMillis(),
        defaultIfUnregistered: Boolean = false
    ): Boolean {
        val cacheKey = "$flagKey:$tenantId:$userId"
        val cached = l1Cache[cacheKey]
        if (cached != null) return cached

        val flag = flagRegistry[flagKey] ?: return defaultIfUnregistered

        // 1. Kill Switch
        if (flag.isKillSwitchActive) {
            l1Cache[cacheKey] = false
            return false
        }

        // 2. Expiración
        if (flag.expirationTimestamp != null && currentTimeMillis > flag.expirationTimestamp) {
            l1Cache[cacheKey] = false
            return false
        }

        // 3. Estado base
        if (!flag.isEnabled) {
            l1Cache[cacheKey] = false
            return false
        }

        // 4. Rollout gradual mediante Hash Consistente
        val result = if (flag.rolloutPercentage < 100 && userId != null) {
            val hash = CanonicalJsonChecksumHelper.sha256Hex("$flagKey:$userId")
            val bucket = (hash.take(4).toInt(16) % 100)
            bucket < flag.rolloutPercentage
        } else {
            true
        }

        l1Cache[cacheKey] = result
        return result
    }

    fun clearCache() {
        l1Cache.clear()
    }
}
