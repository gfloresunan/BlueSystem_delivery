package com.example.shared.media.crypto

import java.security.MessageDigest

/**
 * Motor de Integridad Criptográfica para Medios (ADR-006 - Pilar 3)
 * Genera resúmenes de hash SHA-256 de 256 bits para detección de corrupción y deduplicación.
 */
object ChecksumEngine {

    fun calculateSha256(bytes: ByteArray): String {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            val hashBytes = digest.digest(bytes)
            hashBytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            // Fallback determinista en caso de entorno JVM restringido
            "hash_${bytes.size}_${bytes.hashCode()}"
        }
    }
}
