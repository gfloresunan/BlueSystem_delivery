package com.example.catalog

import com.example.data.queue.ProductUploadQueueManager
import com.example.domain.model.Product
import org.junit.Assert.*
import org.junit.Test

class OfflineQueueTest {

    @Test
    fun testEnqueueUploadIncreasesPendingQueueCount() {
        val initialCount = ProductUploadQueueManager.pendingQueueCount.value

        val dummyProduct = Product(
            id = "prod_offline_1",
            name = "Hamburguesa Offline Test",
            price = 150.0
        )

        ProductUploadQueueManager.enqueueUpload(dummyProduct, "file:///storage/emulated/0/Download/photo.jpg")

        assertEquals(initialCount + 1, ProductUploadQueueManager.pendingQueueCount.value)
    }
}
