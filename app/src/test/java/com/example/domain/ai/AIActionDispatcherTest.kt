package com.example.domain.ai

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.Screen
import com.example.domain.engine.ai.AIActionDispatcher
import com.example.domain.engine.ai.AIDispatchStatus
import com.example.domain.model.ai.AIAction
import com.example.domain.model.ai.AIActionType
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * BlueSystem Delivery Enterprise — Suite de Pruebas para Phase C3-F:
 * AIActionDispatcher & Deep Navigation Integration
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class AIActionDispatcherTest {

    private lateinit var authenticatedDispatcher: AIActionDispatcher
    private lateinit var unauthenticatedDispatcher: AIActionDispatcher

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val options = FirebaseOptions.Builder()
            .setApplicationId("com.aistudio.delivery.djweq")
            .setApiKey("AIzaSyFakeKeyForTestOnly1234567890")
            .setProjectId("bluesystem-delivery")
            .build()

        if (FirebaseApp.getApps(context).isEmpty()) {
            FirebaseApp.initializeApp(context, options)
        }

        authenticatedDispatcher = AIActionDispatcher(isUserAuthenticatedProvider = { true })
        unauthenticatedDispatcher = AIActionDispatcher(isUserAuthenticatedProvider = { false })
    }

    @Test
    fun `C3F-01 - Accion Conocida OPEN_PRODUCT mapea a comercio existente`() {
        val action = AIAction(
            actionId = "act_prod_1",
            actionType = AIActionType.OPEN_PRODUCT,
            parameters = mapOf("businessId" to "biz_napoli_123", "productId" to "prod_pizza_456")
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals("comercio_detalle_screen/biz_napoli_123", result.targetRouteResolved)
    }

    @Test
    fun `C3F-02 - Accion Conocida OPEN_BUSINESS mapea a comercio existente`() {
        val action = AIAction(
            actionId = "act_biz_1",
            actionType = AIActionType.OPEN_BUSINESS,
            parameters = mapOf("businessId" to "biz_burger_789")
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals("comercio_detalle_screen/biz_burger_789", result.targetRouteResolved)
    }

    @Test
    fun `C3F-03 - Accion OPEN_ORDER con orderId especifico mapea a OrderDetail`() {
        val action = AIAction(
            actionId = "act_ord_1",
            actionType = AIActionType.OPEN_ORDER,
            parameters = mapOf("orderId" to "ord_999888")
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals(Screen.OrderDetail.createRoute("ord_999888"), result.targetRouteResolved)
    }

    @Test
    fun `C3F-04 - Accion OPEN_ORDER sin orderId navega al historial general de ordenes`() {
        val action = AIAction(
            actionId = "act_ord_hist",
            actionType = AIActionType.OPEN_ORDER,
            parameters = emptyMap()
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals(Screen.OrdersHistory.route, result.targetRouteResolved)
    }

    @Test
    fun `C3F-05 - Accion OPEN_TRACKING con pedido y motorizado mapea a TrackingPedido seguro`() {
        val action = AIAction(
            actionId = "act_track_1",
            actionType = AIActionType.OPEN_TRACKING,
            parameters = mapOf("orderId" to "ord_12345", "motorizadoId" to "courier_juan")
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals(Screen.TrackingPedido.createRoute("ord_12345", "courier_juan"), result.targetRouteResolved)
    }

    @Test
    fun `C3F-06 - Accion OPEN_CART mapea a tab de carrito existente`() {
        val action = AIAction(
            actionId = "act_cart",
            actionType = AIActionType.OPEN_CART
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals("customer_dashboard?tab=2", result.targetRouteResolved)
    }

    @Test
    fun `C3F-07 - Accion OPEN_ADDRESS_MANAGER mapea a AddressManager existente`() {
        val action = AIAction(
            actionId = "act_addr",
            actionType = AIActionType.OPEN_ADDRESS_MANAGER
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertEquals(Screen.AddressManager.route, result.targetRouteResolved)
    }

    @Test
    fun `C3F-08 - Bloqueo de Accion No Autorizada si requiere autenticacion activa`() {
        val action = AIAction(
            actionId = "act_secure_order",
            actionType = AIActionType.OPEN_ORDER,
            parameters = mapOf("orderId" to "ord_private_123"),
            requiresAuthentication = true
        )

        val result = unauthenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.REJECTED_UNAUTHORIZED, result.status)
        assertNull(result.targetRouteResolved)
    }

    @Test
    fun `C3F-09 - Intercepcion de Puerta de Confirmacion para Acciones Level 3 y Level 4`() {
        val action = AIAction(
            actionId = "act_conf_order",
            actionType = AIActionType.REQUEST_ORDER_CONFIRMATION,
            requiresConfirmation = true
        )

        val result = authenticatedDispatcher.dispatch(action)

        assertEquals(AIDispatchStatus.REQUIRES_CONFIRMATION, result.status)
        assertNull(result.targetRouteResolved)
    }

    @Test
    fun `C3F-10 - Rechazo de Parametros Maliciosos con Path Traversal o Inyeccion de Caracteres`() {
        val malformedAction = AIAction(
            actionId = "act_malicious",
            actionType = AIActionType.OPEN_BUSINESS,
            parameters = mapOf("businessId" to "../../../admin/secret")
        )

        val result = authenticatedDispatcher.dispatch(malformedAction)

        assertEquals(AIDispatchStatus.REJECTED_MALFORMED_PARAMETERS, result.status)
        assertNull(result.targetRouteResolved)
    }

    @Test
    fun `C3F-11 - Rechazo de Inyeccion de Scripts o Protocolos Peligrosos`() {
        val scriptAction = AIAction(
            actionId = "act_xss",
            actionType = AIActionType.OPEN_PRODUCT,
            parameters = mapOf("businessId" to "javascript:alert(1)")
        )

        val result = authenticatedDispatcher.dispatch(scriptAction)

        assertEquals(AIDispatchStatus.REJECTED_MALFORMED_PARAMETERS, result.status)
        assertNull(result.targetRouteResolved)
    }

    @Test
    fun `C3F-12 - Renderizado Puro de Tarjetas en Overlay no requiere navegacion`() {
        val renderAction = AIAction(
            actionId = "act_render",
            actionType = AIActionType.RENDER_PRODUCT_CARD
        )

        val result = authenticatedDispatcher.dispatch(renderAction)

        assertEquals(AIDispatchStatus.SUCCESS, result.status)
        assertNull(result.targetRouteResolved)
    }
}
