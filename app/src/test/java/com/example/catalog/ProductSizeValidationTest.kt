package com.example.catalog

import com.example.data.repository.ProductRepository
import com.example.domain.model.Product
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ProductSizeValidationTest {

    private lateinit var repository: ProductRepository

    @Before
    fun setUp() {
        repository = ProductRepository()
    }

    @Test
    fun testValidProductPassesSizeValidation() {
        val product = Product(
            id = "prod_12345",
            businessId = "bus_999",
            name = "Hamburguesa Premium BBQ",
            description = "Hamburguesa artesanal con carne de res, queso cheddar y tocineta",
            price = 280.0,
            categoryName = "Hamburguesas",
            imageUrl = "https://firebasestorage.googleapis.com/v0/b/app/o/products%2Fprod_12345%2Foriginal.webp?alt=media",
            thumbnailUrl = "https://firebasestorage.googleapis.com/v0/b/app/o/products%2Fprod_12345%2Fthumb.webp?alt=media",
            storagePath = "products/prod_12345/original.webp",
            mimeType = "image/webp",
            width = 1080,
            height = 1080,
            sizeBytes = 185000L,
            images = listOf("https://firebasestorage.googleapis.com/v0/b/app/o/products%2Fprod_12345%2Foriginal.webp?alt=media")
        )

        val result = repository.validateFirestoreDocumentSize(product)
        assertTrue("El documento de producto válido debería ser aceptado por la validación", result.isSuccess)
    }

    @Test
    fun testBase64ProductFailsSizeValidation() {
        val productWithBase64 = Product(
            id = "prod_bad",
            name = "Producto con Base64 inflado",
            imageUrl = "data:image/jpeg;base64," + "A".repeat(1000)
        )

        val result = repository.validateFirestoreDocumentSize(productWithBase64)
        assertTrue("Un producto con string Base64 debe ser rechazado", result.isFailure)
        assertEquals("Violación de Arquitectura: imageUrl contiene string Base64", result.exceptionOrNull()?.message)
    }
}
