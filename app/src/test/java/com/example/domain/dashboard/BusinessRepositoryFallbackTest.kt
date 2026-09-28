package com.example.domain.dashboard

import com.example.data.repository.toBusinessInfoSafely
import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import io.mockk.every
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Test unitario para verificar la corrección del hallazgo P2 en BusinessRepository:
 * toBusinessInfoSafely debe preservar unitsSold30d, priceParityVerified y activatedAt
 * incluso cuando toObject falla y se recurre al parsing manual.
 */
class BusinessRepositoryFallbackTest {

    @Test
    fun `toBusinessInfoSafely preserves canonical C2D fields on manual parsing fallback`() {
        val snapshot = mockk<DocumentSnapshot>(relaxed = true)

        // Forzar falla de toObject() para activar el fallback manual
        every { snapshot.toObject(any<Class<*>>()) } throws RuntimeException("Type mismatch in legacy schema")

        val fixedTimestamp = Timestamp(1725700000L, 0)

        every { snapshot.id } returns "biz_fallback_01"
        every { snapshot.getString("name") } returns "Restaurante Fallback"
        every { snapshot.getString("category") } returns "Comida Casera"
        every { snapshot.getString("status") } returns "ACTIVE"

        // Mock de campos canónicos C2D
        every { snapshot.get("unitsSold30d") } returns 280
        every { snapshot.get("priceParityVerified") } returns true
        every { snapshot.getTimestamp("priceParityVerifiedAt") } returns fixedTimestamp
        every { snapshot.getTimestamp("activatedAt") } returns fixedTimestamp

        val result = snapshot.toBusinessInfoSafely()

        assertNotNull("El resultado no debe ser nulo en fallback", result)
        result!!

        assertEquals("biz_fallback_01", result.id)
        assertEquals("Restaurante Fallback", result.name)
        assertEquals(280, result.unitsSold30d)
        assertTrue("priceParityVerified debe ser true", result.priceParityVerified)
        assertEquals(fixedTimestamp, result.priceParityVerifiedAt)
        assertEquals(fixedTimestamp, result.activatedAt)
    }
}
