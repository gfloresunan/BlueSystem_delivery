package com.example.enterprise

import com.example.enterprise.featureflags.FeatureFlag
import com.example.enterprise.featureflags.FeatureFlagEngine
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FeatureFlagEngineTest {

    private val engine = FeatureFlagEngine()

    @Test
    fun `test kill switch disables flag immediately`() {
        val flag = FeatureFlag(key = "new_checkout", isEnabled = true, isKillSwitchActive = true)
        engine.registerFlag(flag)

        assertFalse(engine.isFeatureEnabled("new_checkout"))
    }

    @Test
    fun `test rollout percentage consistent hashing for users`() {
        val flag = FeatureFlag(key = "kds_v2", isEnabled = true, rolloutPercentage = 50)
        engine.registerFlag(flag)

        // Verificación determinista para un usuario dado
        val isEnabledUserA = engine.isFeatureEnabled("kds_v2", userId = "user_a")
        val isEnabledUserAAgain = engine.isFeatureEnabled("kds_v2", userId = "user_a")

        assertEquals(isEnabledUserA, isEnabledUserAAgain)
    }
}
