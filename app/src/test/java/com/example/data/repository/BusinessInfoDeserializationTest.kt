package com.example.data.repository

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BusinessInfoDeserializationTest {

    @Test
    fun `test El Chanchito production document mapping`() {
        val chanchito = BusinessInfo(
            id = "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
            name = "El Chanchito",
            comercioNombre = "El Chanchito",
            nombre = "El Chanchito",
            category = "Restaurante",
            categoria = "Restaurante",
            address = "Residencial Las Delicias Casa Q529",
            direccion = "Residencial Las Delicias Casa Q529",
            logoUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910970071_chanchito.jpg?alt=media&token=c36c8000-10e7-4b78-b22a-b76ac2aeeb7a",
            bannerUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786910976029_banner_chanchito.jpg?alt=media&token=e834f149-8466-4f18-ac5b-ccfa828a5dde",
            isOpen = true,
            abierto = true,
            deliveryFee = 35.0,
            isFeatured = true,
            featured = true,
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false
        )

        assertEquals("El Chanchito", chanchito.getEffectiveName())
        assertEquals("Restaurante", chanchito.getEffectiveCategory())
        assertEquals("Residencial Las Delicias Casa Q529", chanchito.getEffectiveAddress())
        assertTrue(chanchito.getEffectiveIsActive())
        assertTrue(chanchito.getEffectiveIsFeatured())
        assertTrue(chanchito.getEffectiveIsOpen())
        assertTrue(chanchito.isValidPublicCatalogItem())
    }

    @Test
    fun `test FRITONI production document mapping`() {
        val fritoni = BusinessInfo(
            id = "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
            name = "FRITONI",
            comercioNombre = "FRITONI",
            nombre = "FRITONI",
            category = "Restaurante",
            categoria = "Restaurante",
            address = "Barrio el Boer",
            direccion = "Barrio el Boer",
            logoUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786028783659_607421313_122094264237204960_3693436955939460644_n.jpg?alt=media&token=e17dbcf9-b7b5-4663-b5a8-4e1578683f40",
            bannerUrl = "https://firebasestorage.googleapis.com/v0/b/bluesystem-7c9af.firebasestorage.app/o/commerce_assets%2F1786028790361_banner_fritoni.png?alt=media&token=fb014795-a1dd-46f3-b776-f4a80f8a3bff",
            isOpen = true,
            abierto = true,
            deliveryFee = 50.0,
            isFeatured = true,
            featured = true,
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false
        )

        assertEquals("FRITONI", fritoni.getEffectiveName())
        assertEquals("Restaurante", fritoni.getEffectiveCategory())
        assertEquals("Barrio el Boer", fritoni.getEffectiveAddress())
        assertTrue(fritoni.getEffectiveIsActive())
        assertTrue(fritoni.getEffectiveIsFeatured())
        assertTrue(fritoni.getEffectiveIsOpen())
        assertTrue(fritoni.isValidPublicCatalogItem())
    }

    @Test
    fun `test Variedades TECNOHOME production document mapping`() {
        val tecnohome = BusinessInfo(
            id = "tecnohome_doc_id",
            name = "Variedades TECNOHOME",
            comercioNombre = "Variedades TECNOHOME",
            nombre = "Variedades TECNOHOME",
            category = "Variedades",
            categoria = "Variedades",
            address = "Juigalpa, Chontales",
            direccion = "Juigalpa, Chontales",
            isOpen = true,
            abierto = true,
            deliveryFee = 40.0,
            isFeatured = false,
            featured = false,
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false
        )

        assertEquals("Variedades TECNOHOME", tecnohome.getEffectiveName())
        assertEquals("Variedades", tecnohome.getEffectiveCategory())
        assertEquals("Juigalpa, Chontales", tecnohome.getEffectiveAddress())
        assertTrue(tecnohome.getEffectiveIsActive())
        assertFalse(tecnohome.getEffectiveIsFeatured())
        assertTrue(tecnohome.getEffectiveIsOpen())
        assertTrue(tecnohome.isValidPublicCatalogItem())
    }

    @Test
    fun `test catalog count with production stores`() {
        val chanchito = BusinessInfo(
            id = "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
            name = "El Chanchito",
            category = "Restaurante",
            address = "Residencial Las Delicias",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isFeatured = true,
            featured = true
        )
        val fritoni = BusinessInfo(
            id = "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
            name = "FRITONI",
            category = "Restaurante",
            address = "Barrio el Boer",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isFeatured = true,
            featured = true
        )
        val tecnohome = BusinessInfo(
            id = "tecnohome_doc_id",
            name = "Variedades TECNOHOME",
            category = "Variedades",
            address = "Juigalpa, Chontales",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isFeatured = false,
            featured = false
        )

        val list = listOf(chanchito, fritoni, tecnohome)
        val validCatalogList = list.filter { it.isValidPublicCatalogItem() }
        val featuredCatalogList = validCatalogList.filter { it.getEffectiveIsFeatured() }

        assertEquals(3, validCatalogList.size)
        assertEquals(listOf("El Chanchito", "FRITONI", "Variedades TECNOHOME"), validCatalogList.map { it.getEffectiveName() })

        assertEquals(2, featuredCatalogList.size)
        assertEquals(listOf("El Chanchito", "FRITONI"), featuredCatalogList.map { it.getEffectiveName() })

        assertTrue(tecnohome.getEffectiveIsActive())
        assertFalse(tecnohome.getEffectiveIsFeatured())
        assertTrue(tecnohome.isValidPublicCatalogItem())
    }

    @Test
    fun `test JB Porcinos production document mapping`() {
        val jbPorcinos = BusinessInfo(
            id = "baf45f11-c9b1-45ef-a099-7a9b486d0d47",
            name = "JB Porcinos",
            comercioNombre = "JB Porcinos",
            nombre = "JB Porcinos",
            category = "Tiendas",
            categoria = "Tiendas",
            address = "Managua, Nicaragua",
            isOpen = true,
            abierto = true,
            deliveryFee = 35.0,
            isFeatured = false,
            featured = false,
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false
        )

        assertEquals("JB Porcinos", jbPorcinos.getEffectiveName())
        assertEquals("Tiendas", jbPorcinos.getEffectiveCategory())
        assertTrue("JB Porcinos debe ser un ítem válido de catálogo", jbPorcinos.isValidPublicCatalogItem())
        assertTrue("JB Porcinos debe estar activo", jbPorcinos.getEffectiveIsActive())
        assertFalse("JB Porcinos no es destacado", jbPorcinos.getEffectiveIsFeatured())
    }

    @Test
    fun `test TECNOSTORE production document mapping`() {
        val tecnostore = BusinessInfo(
            id = "biz_canonical_tecnostore",
            name = "TECNOSTORE",
            comercioNombre = "TECNOSTORE",
            nombre = "TECNOSTORE",
            category = "Tecnología",
            categoria = "Tecnología",
            address = "Managua, Nicaragua",
            isOpen = true,
            abierto = true,
            deliveryFee = 45.0,
            isFeatured = false,
            featured = false,
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false
        )

        assertEquals("TECNOSTORE", tecnostore.getEffectiveName())
        assertEquals("Tecnología", tecnostore.getEffectiveCategory())
        assertTrue("TECNOSTORE debe ser un ítem válido de catálogo", tecnostore.isValidPublicCatalogItem())
        assertTrue("TECNOSTORE debe estar activo", tecnostore.getEffectiveIsActive())
        assertFalse("TECNOSTORE no es destacado", tecnostore.getEffectiveIsFeatured())
    }

    @Test
    fun `test El Dariano deleted store exclusion`() {
        val elDariano = BusinessInfo(
            id = "00552e8b-3473-413c-9594-793fdb42dfdd",
            name = "El Dariano",
            comercioNombre = "El Dariano",
            nombre = "El Dariano",
            category = "Farmacia",
            categoria = "Farmacia",
            address = "Del DDF 2 c al este B. San Antonio",
            isOpen = true,
            abierto = true,
            deliveryFee = 35.0,
            isFeatured = false,
            featured = false,
            isActive = false,
            active = false,
            status = "DELETED",
            lifecycleStatus = "DEPROVISIONED",
            isDeleted = true
        )

        assertEquals("El Dariano", elDariano.getEffectiveName())
        assertFalse("El Dariano DEBE ser inactivo", elDariano.getEffectiveIsActive())
        assertFalse("El Dariano NUNCA debe ser un ítem válido de catálogo público", elDariano.isValidPublicCatalogItem())
    }

    @Test
    fun `test full 5-store marketplace catalog discovery and exclusion of deleted stores`() {
        val jbPorcinos = BusinessInfo(
            id = "baf45f11-c9b1-45ef-a099-7a9b486d0d47",
            name = "JB Porcinos",
            category = "Tiendas",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false,
            isFeatured = false
        )
        val chanchito = BusinessInfo(
            id = "bbb760d5-a8f3-4700-9a96-f58f11f345ac",
            name = "El Chanchito",
            category = "Restaurante",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false,
            isFeatured = true
        )
        val tecnostore = BusinessInfo(
            id = "biz_canonical_tecnostore",
            name = "TECNOSTORE",
            category = "Tecnología",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false,
            isFeatured = false
        )
        val fritoni = BusinessInfo(
            id = "dlRY2ZVUqPR2Fxoc3cazcOxxRJg2",
            name = "FRITONI",
            category = "Restaurante",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false,
            isFeatured = true
        )
        val tecnohome = BusinessInfo(
            id = "e7dc911e-e587-4be9-a741-7d9d9828011f",
            name = "Variedades TECNOHOME",
            category = "Tecnología",
            isActive = true,
            active = true,
            status = "ACTIVE",
            lifecycleStatus = "ACTIVE",
            isDeleted = false,
            isFeatured = true
        )
        val elDariano = BusinessInfo(
            id = "00552e8b-3473-413c-9594-793fdb42dfdd",
            name = "El Dariano",
            category = "Farmacia",
            isActive = false,
            active = false,
            status = "DELETED",
            lifecycleStatus = "DEPROVISIONED",
            isDeleted = true,
            isFeatured = false
        )

        val fullDb = listOf(jbPorcinos, chanchito, tecnostore, fritoni, tecnohome, elDariano)
        val validCatalog = fullDb.filter { it.isValidPublicCatalogItem() }

        assertEquals("El catálogo debe contener exactamente los 5 comercios canónicos", 5, validCatalog.size)
        val validNames = validCatalog.map { it.getEffectiveName() }
        assertTrue(validNames.contains("JB Porcinos"))
        assertTrue(validNames.contains("El Chanchito"))
        assertTrue(validNames.contains("TECNOSTORE"))
        assertTrue(validNames.contains("FRITONI"))
        assertTrue(validNames.contains("Variedades TECNOHOME"))
        assertFalse("El Dariano no debe estar en el catálogo", validNames.contains("El Dariano"))

        val featuredList = validCatalog.filter { it.getEffectiveIsFeatured() }
        assertEquals("Destacados debe contener únicamente los 3 con isFeatured = true", 3, featuredList.size)
        val featuredNames = featuredList.map { it.getEffectiveName() }
        assertTrue(featuredNames.contains("El Chanchito"))
        assertTrue(featuredNames.contains("FRITONI"))
        assertTrue(featuredNames.contains("Variedades TECNOHOME"))
        assertFalse(featuredNames.contains("JB Porcinos"))
        assertFalse(featuredNames.contains("TECNOSTORE"))
    }
}
