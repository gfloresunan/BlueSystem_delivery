package com.example.optimization

import com.example.domain.engine.archiving.DataArchivingEngine
import com.example.domain.model.order.Order
import org.junit.Assert.assertEquals
import org.junit.Test

class DataArchivingEngineTest {

    private val archivingEngine = DataArchivingEngine(retentionDaysThreshold = 90)

    @Test
    fun `test archiving policy separates orders older than 90 days`() {
        val now = System.currentTimeMillis()
        val recentOrder = Order(id = "o_recent", createdAt = now - (10L * 24L * 60L * 60L * 1000L)) // 10 días
        val oldOrder = Order(id = "o_old", createdAt = now - (100L * 24L * 60L * 60L * 1000L))    // 100 días

        val (remaining, toArchive) = archivingEngine.executeOrdersArchivingPolicy(listOf(recentOrder, oldOrder), now)

        assertEquals(1, remaining.size)
        assertEquals("o_recent", remaining[0].id)

        assertEquals(1, toArchive.size)
        assertEquals("o_old", toArchive[0].id)
    }
}
