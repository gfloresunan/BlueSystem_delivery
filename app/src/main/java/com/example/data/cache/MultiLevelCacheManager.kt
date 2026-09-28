package com.example.data.cache

import com.example.domain.model.menu.MenuSnapshot

enum class CacheLevel {
    L1_MEMORY,
    L2_DISK,
    L3_FIRESTORE
}

data class CacheResult<T>(
    val data: T?,
    val levelServedFrom: CacheLevel,
    val latencyMs: Long
)

/**
 * Gestor de Caché Multinivel (L1 Memory -> L2 Disk -> L3 Firestore) (Objetivo 3 y 11).
 * Implementa la regla de evaluación inteligente de versión: La app del cliente nunca
 * vuelve a descargar el menú si la versión publicada no ha cambiado.
 */
class MultiLevelCacheManager {

    private val l1MemoryCache = mutableMapOf<String, Pair<Long, Any>>() // key -> (version, object)
    private val l2DiskCache = mutableMapOf<String, Pair<Long, Any>>()   // key -> (version, object)

    suspend fun <T> getOrFetchCustomerMenu(
        restaurantId: String,
        remoteVersion: Long,
        remoteFetcher: suspend () -> T?
    ): CacheResult<T> {
        val startTime = System.currentTimeMillis()
        val key = "menu_$restaurantId"

        // 1. Consulta Caché L1 (Memoria)
        val l1Entry = l1MemoryCache[key]
        if (l1Entry != null && l1Entry.first >= remoteVersion) {
            val latency = System.currentTimeMillis() - startTime
            @Suppress("UNCHECKED_CAST")
            return CacheResult(l1Entry.second as T, CacheLevel.L1_MEMORY, latency)
        }

        // 2. Consulta Caché L2 (Disco Local / Room)
        val l2Entry = l2DiskCache[key]
        if (l2Entry != null && l2Entry.first >= remoteVersion) {
            // Promover a L1
            l1MemoryCache[key] = l2Entry
            val latency = System.currentTimeMillis() - startTime
            @Suppress("UNCHECKED_CAST")
            return CacheResult(l2Entry.second as T, CacheLevel.L2_DISK, latency)
        }

        // 3. Consulta L3 (Firestore / Red) únicamente si la versión cambió o no está en caché
        val remoteData = remoteFetcher()
        if (remoteData != null) {
            l1MemoryCache[key] = Pair(remoteVersion, remoteData)
            l2DiskCache[key] = Pair(remoteVersion, remoteData)
        }

        val latency = System.currentTimeMillis() - startTime
        return CacheResult(remoteData, CacheLevel.L3_FIRESTORE, latency)
    }

    fun clearL1() {
        l1MemoryCache.clear()
    }

    fun clearAll() {
        l1MemoryCache.clear()
        l2DiskCache.clear()
    }
}
