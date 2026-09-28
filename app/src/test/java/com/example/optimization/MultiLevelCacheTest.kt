package com.example.optimization

import com.example.data.cache.CacheLevel
import com.example.data.cache.MultiLevelCacheManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MultiLevelCacheTest {

    private val cacheManager = MultiLevelCacheManager()

    @Test
    fun `test Smart Menu Evaluator serves from L1 cache when version does not change`() = runBlocking {
        var remoteCallCount = 0

        // Primera llamada: Descarga L3 Firestore
        val result1 = cacheManager.getOrFetchCustomerMenu("rest1", remoteVersion = 1L) {
            remoteCallCount++
            "MenuData_v1"
        }
        assertEquals(CacheLevel.L3_FIRESTORE, result1.levelServedFrom)
        assertEquals(1, remoteCallCount)

        // Segunda llamada con la misma versión 1L: Servido desde L1 Memoria sin llamada remota
        val result2 = cacheManager.getOrFetchCustomerMenu("rest1", remoteVersion = 1L) {
            remoteCallCount++
            "MenuData_v1"
        }
        assertEquals(CacheLevel.L1_MEMORY, result2.levelServedFrom)
        assertEquals(1, remoteCallCount) // No incrementó
    }

    @Test
    fun `test Smart Menu Evaluator refetches from L3 when version increments`() = runBlocking {
        var remoteCallCount = 0

        cacheManager.getOrFetchCustomerMenu("rest1", remoteVersion = 1L) {
            remoteCallCount++
            "MenuData_v1"
        }

        // Llamada con versión 2L (Servidor publicó nueva versión): Descarga L3 Firestore
        val resultV2 = cacheManager.getOrFetchCustomerMenu("rest1", remoteVersion = 2L) {
            remoteCallCount++
            "MenuData_v2"
        }

        assertEquals(CacheLevel.L3_FIRESTORE, resultV2.levelServedFrom)
        assertEquals(2, remoteCallCount)
        assertEquals("MenuData_v2", resultV2.data)
    }
}
