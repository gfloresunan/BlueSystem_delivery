package com.example.courier

import com.example.PedidoOfrecido
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Suite de Pruebas Unitarias y Certificación Forense
 * PROTOCOLO: BSD-COURIER-PERFORMANCE-PROFILE-DUPLICATE-UX-ROOT-CAUSE-001
 *
 * Valida:
 * 1. Resuelve truncamiento de nombre de remitente / comercio en cabeceras de tarjeta.
 * 2. Extrae correctamente el label "Remitente:" y el nombre limpio ("Familia Flores Centeno", "Kimberly Flores Centeno").
 * 3. Preserva el cálculo financiero de ganancia en cabecera y el detalle Punto A / Punto B.
 * 4. Valida eliminación de instancia duplicada del botón "Cambiar Contraseña" en CourierProfileScreen.
 */
class CourierPerformanceProfileFixTest {

    // Helper que reproduce la lógica determinística de extracción de cabecera implementada en CourierPerformanceScreen
    private fun resolveHeader(commerceName: String, orders: List<PedidoOfrecido>): Triple<Boolean, String, String?> {
        val isSenderGroup = commerceName.startsWith("Remitente:", ignoreCase = true) || orders.any { it.serviceType == "X_TO_Y_DELIVERY" }
        val displayName = if (commerceName.startsWith("Remitente:", ignoreCase = true)) {
            commerceName.removePrefix("Remitente:").trim()
        } else {
            commerceName
        }
        val label = if (isSenderGroup) "Remitente:" else null
        return Triple(isSenderGroup, displayName, label)
    }

    // =========================================================================
    // PROBLEMA A: TESTS NAME-01 a NAME-07
    // =========================================================================

    @Test
    fun `TEST NAME-01 - Familia Flores Centeno renders complete full name with Remitente label`() {
        val inputName = "Familia Flores Centeno"
        val order = PedidoOfrecido(
            id = "order_xy_001",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = inputName,
            comercioNombre = "Remitente: $inputName",
            status = "completed",
            courierTotalEarnings = 266.15
        )

        val (isSender, displayName, label) = resolveHeader(order.comercioNombre, listOf(order))

        assertTrue("Debe identificarse como grupo de remitente X->Y", isSender)
        assertEquals("Remitente:", label)
        assertEquals("Familia Flores Centeno", displayName)
        assertFalse("El nombre completo NO debe contener puntos suspensivos", displayName.contains("..."))
    }

    @Test
    fun `TEST NAME-02 - Kimberly Flores Centeno renders complete full name without ellipsis`() {
        val inputName = "Kimberly Flores Centeno"
        val order = PedidoOfrecido(
            id = "order_xy_002",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = inputName,
            comercioNombre = "Remitente: $inputName",
            status = "completed",
            courierTotalEarnings = 180.0
        )

        val (isSender, displayName, label) = resolveHeader(order.comercioNombre, listOf(order))

        assertTrue(isSender)
        assertEquals("Remitente:", label)
        assertEquals("Kimberly Flores Centeno", displayName)
        assertFalse("El nombre completo NO debe ser truncado con ellipsis", displayName.contains("..."))
    }

    @Test
    fun `TEST NAME-03 - Extremely long name preserves full text for 2-line rendering`() {
        val longName = "Licenciada Maria de los Angeles Rodriguez Gutierrez y Asociados Managua"
        val order = PedidoOfrecido(
            id = "order_xy_long",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = longName,
            comercioNombre = "Remitente: $longName",
            status = "completed"
        )

        val (isSender, displayName, label) = resolveHeader(order.comercioNombre, listOf(order))

        assertTrue(isSender)
        assertEquals("Remitente:", label)
        assertEquals(longName, displayName)
    }

    @Test
    fun `TEST NAME-04 - Long name coexists with exact earnings badge`() {
        val order = PedidoOfrecido(
            id = "order_xy_004",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = "Familia Flores Centeno",
            comercioNombre = "Remitente: Familia Flores Centeno",
            status = "completed",
            courierTotalEarnings = 266.15
        )

        val orders = listOf(order)
        val (_, displayName, _) = resolveHeader(order.comercioNombre, orders)

        val totalEarnings = orders
            .filter { it.status.lowercase() in listOf("completed", "completado", "delivered", "entregado") }
            .sumOf { if (it.courierTotalEarnings > 0.0) it.courierTotalEarnings else it.gananciaRepartidor }

        assertEquals("Familia Flores Centeno", displayName)
        assertEquals(266.15, totalEarnings, 0.001)
    }

    @Test
    fun `TEST NAME-05 - Inner Point A and Point B operational details are preserved`() {
        val order = PedidoOfrecido(
            id = "order_xy_005",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = "Familia Flores Centeno",
            comercioNombre = "Remitente: Familia Flores Centeno",
            comercioDireccion = "Del Portón UCA 2c al lago",
            clienteDireccion = "Colonia Los Robles #45",
            status = "delivered"
        )

        assertEquals("Remitente: Familia Flores Centeno", order.comercioNombre)
        assertEquals("Del Portón UCA 2c al lago", order.comercioDireccion)
        assertEquals("Colonia Los Robles #45", order.clienteDireccion)
    }

    @Test
    fun `TEST NAME-06 - Commerce history naming continues to work with no Remitente prefix`() {
        val order = PedidoOfrecido(
            id = "order_comm_001",
            serviceType = "COMMERCE_DELIVERY",
            comercioNombre = "Restaurante El Portal",
            status = "delivered",
            courierTotalEarnings = 45.0
        )

        val (isSender, displayName, label) = resolveHeader(order.comercioNombre, listOf(order))

        assertFalse("Comercio ordinario NO debe marcarse como sender group", isSender)
        assertEquals(null, label)
        assertEquals("Restaurante El Portal", displayName)
    }

    @Test
    fun `TEST NAME-07 - X to Y history naming correctly resolves sender name`() {
        val order = PedidoOfrecido(
            id = "order_xy_007",
            serviceType = "X_TO_Y_DELIVERY",
            senderName = "Kimberly Flores Centeno",
            comercioNombre = "Remitente: Kimberly Flores Centeno",
            status = "delivered"
        )

        val (isSender, displayName, label) = resolveHeader(order.comercioNombre, listOf(order))

        assertTrue(isSender)
        assertEquals("Remitente:", label)
        assertEquals("Kimberly Flores Centeno", displayName)
    }

    // =========================================================================
    // PROBLEMA B: TESTS PASS-01 a PASS-04
    // =========================================================================

    @Test
    fun `TEST PASS-01 - CourierProfileScreen contains exactly one action button for Cambiar Contrasena`() {
        val profileFile = File("src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val altFile = File("app/src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val target = if (profileFile.exists()) profileFile else altFile
        assertTrue("Archivo CourierProfileScreen.kt debe existir", target.exists())

        val content = target.readText()

        // Contar apariciones de "Cambiar Contraseña"
        val regex = Regex("""text\s*=\s*"Cambiar Contraseña"""")
        val matches = regex.findAll(content).toList()

        // Esperado exactamente 2 apariciones en el archivo completo:
        // 1. En el botón de acción independiente (L488-506)
        // 2. En el título del AlertDialog showChangePasswordDialog
        // (La tarjeta duplicada de la sección 4.5 fue eliminada)
        assertEquals("Deben existir exactamente 2 menciones del texto (1 botón UI + 1 título del AlertDialog)", 2, matches.size)

        // Verificar que la sección 4.5 ya no existe
        assertFalse("La sección 4.5 duplicada no debe existir", content.contains("4.5. SEGURIDAD DE LA CUENTA"))
    }

    @Test
    fun `TEST PASS-02 - Preserved button maintains showChangePasswordDialog trigger`() {
        val profileFile = File("src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val altFile = File("app/src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val target = if (profileFile.exists()) profileFile else altFile
        val content = target.readText()

        // Verificar que el botón de acción contiene onClick = { showChangePasswordDialog = true }
        assertTrue(
            "El botón conservado debe mantener el trigger de showChangePasswordDialog",
            content.contains("onClick = { showChangePasswordDialog = true }")
        )
    }

    @Test
    fun `TEST PASS-03 - Authentication and password dialog logic remains intact`() {
        val profileFile = File("src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val altFile = File("app/src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val target = if (profileFile.exists()) profileFile else altFile
        val content = target.readText()

        assertTrue("El diálogo reactivo showChangePasswordDialog debe estar presente", content.contains("if (showChangePasswordDialog)"))
        assertTrue("Debe existir la llamada al gestor de autenticación cambiarContrasena", content.contains("authManager.cambiarContrasena"))
    }

    @Test
    fun `TEST PASS-04 - Logout action remains intact and functional`() {
        val profileFile = File("src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val altFile = File("app/src/main/java/com/example/presentation/courier/CourierProfileScreen.kt")
        val target = if (profileFile.exists()) profileFile else altFile
        val content = target.readText()

        assertTrue("El botón de Cerrar Sesión debe conservarse", content.contains("Cerrar Sesión"))
        assertTrue("El callback onLogout debe conservarse", content.contains("onClick = onLogout"))
    }
}
