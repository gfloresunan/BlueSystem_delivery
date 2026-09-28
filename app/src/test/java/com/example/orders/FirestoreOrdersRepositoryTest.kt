package com.example.orders

import com.example.data.repository.MerchantOrdersRepository
import org.junit.Assert.*
import org.junit.Test

class FirestoreOrdersRepositoryTest {

    @Test
    fun testRepositoryInitializationJvmSafe() {
        val repo = MerchantOrdersRepository()
        assertNotNull(repo)
    }
}
