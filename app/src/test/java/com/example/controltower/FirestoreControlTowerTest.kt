package com.example.controltower

import com.example.data.repository.DeliveryControlTowerRepository
import org.junit.Assert.*
import org.junit.Test

class FirestoreControlTowerTest {

    @Test
    fun testRepositoryInitializationJvmSafe() {
        val repo = DeliveryControlTowerRepository()
        assertNotNull(repo)
    }
}
