package com.example.shared.media

import com.example.shared.media.crypto.ChecksumEngine
import org.junit.Assert.*
import org.junit.Test

class ChecksumEngineTest {

    @Test
    fun testChecksumIsDeterministicForSameInput() {
        val bytes1 = "BlueSystem Enterprise Media Standard".toByteArray(Charsets.UTF_8)
        val bytes2 = "BlueSystem Enterprise Media Standard".toByteArray(Charsets.UTF_8)

        val hash1 = ChecksumEngine.calculateSha256(bytes1)
        val hash2 = ChecksumEngine.calculateSha256(bytes2)

        assertEquals("El hash SHA-256 debe ser idéntico para contenidos iguales", hash1, hash2)
        assertTrue("El hash SHA-256 no debe estar vacío", hash1.isNotBlank())
    }

    @Test
    fun testChecksumIsDifferentForDifferentInput() {
        val bytes1 = "Image 1 Content".toByteArray(Charsets.UTF_8)
        val bytes2 = "Image 2 Content".toByteArray(Charsets.UTF_8)

        val hash1 = ChecksumEngine.calculateSha256(bytes1)
        val hash2 = ChecksumEngine.calculateSha256(bytes2)

        assertNotEquals("Imágenes distintas deben producir hashes SHA-256 diferentes", hash1, hash2)
    }
}
