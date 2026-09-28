package com.example.settings

import com.example.data.repository.RestaurantSettingsRepository
import org.junit.Assert.*
import org.junit.Test

class FirestoreSettingsRepositoryTest {

    @Test
    fun testRepositoryInitializationJvmSafe() {
        val repo = RestaurantSettingsRepository()
        assertNotNull(repo)
    }
}
