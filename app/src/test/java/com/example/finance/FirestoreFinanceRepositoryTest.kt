package com.example.finance

import com.example.data.repository.MerchantFinanceRepository
import org.junit.Assert.*
import org.junit.Test

class FirestoreFinanceRepositoryTest {

    @Test
    fun testRepositoryInitializationJvmSafe() {
        val repo = MerchantFinanceRepository()
        assertNotNull(repo)
    }
}
