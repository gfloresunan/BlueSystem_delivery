package com.example.domain.ai

import com.example.domain.model.ai.*
import org.junit.Assert.*
import org.junit.Test

/**
 * Unit Test Suite for C3-A AI Contracts, Data Models and Tool Registry
 */
class AIContractsAndRegistryTest {

    @Test
    fun testToolRegistryContainsExactly19Tools() {
        assertEquals("ToolRegistry must contain exactly 19 canonical tools", 19, ToolRegistry.toolCount)
        assertEquals("getAllTools must return 19 entries", 19, ToolRegistry.getAllTools().size)
    }

    @Test
    fun testToolRegistrySecurityLevelsDistribution() {
        val level0Tools = ToolRegistry.getToolsForAuthLevel(ToolAuthorizationLevel.LEVEL_0_PUBLIC_READ)
        val level1Tools = ToolRegistry.getToolsForAuthLevel(ToolAuthorizationLevel.LEVEL_1_AUTH_CUSTOMER_READ)
        val level2Tools = ToolRegistry.getToolsForAuthLevel(ToolAuthorizationLevel.LEVEL_2_AUTH_CUSTOMER_MUTATION)
        val level3Tools = ToolRegistry.getToolsForAuthLevel(ToolAuthorizationLevel.LEVEL_3_USER_CONFIRMATION_REQUIRED)
        val level4Tools = ToolRegistry.getToolsForAuthLevel(ToolAuthorizationLevel.LEVEL_4_SERVER_FINANCIAL_MUTATION)

        assertEquals("Level 0 must have exactly 6 tools", 6, level0Tools.size)
        assertEquals("Level 1 must have exactly 5 tools", 5, level1Tools.size)
        assertEquals("Level 2 must have exactly 5 tools", 5, level2Tools.size)
        assertEquals("Level 3 must have exactly 2 tools", 2, level3Tools.size)
        assertEquals("Level 4 must have exactly 1 tool", 1, level4Tools.size)
    }

    @Test
    fun testConfirmationGatedTools() {
        val gatedTools = ToolRegistry.getAllTools().filter { it.requiresConfirmation }
        assertEquals("Exactly 3 tools require explicit confirmation gate", 3, gatedTools.size)

        val gatedToolIds = gatedTools.map { it.toolId }.toSet()
        assertTrue("tool_clear_cart must require confirmation", gatedToolIds.contains("tool_clear_cart"))
        assertTrue("tool_cancel_order must require confirmation", gatedToolIds.contains("tool_cancel_order"))
        assertTrue("tool_create_authoritative_order must require confirmation", gatedToolIds.contains("tool_create_authoritative_order"))
    }

    @Test
    fun testToolExecutionPlanesDistribution() {
        val localTools = ToolRegistry.getToolsForPlane(ToolExecutionPlane.LOCAL)
        val backendTools = ToolRegistry.getToolsForPlane(ToolExecutionPlane.BACKEND)
        val localBackendTools = ToolRegistry.getToolsForPlane(ToolExecutionPlane.LOCAL_BACKEND)

        assertEquals("LOCAL plane must have 11 tools", 11, localTools.size)
        assertEquals("BACKEND plane must have 7 tools", 7, backendTools.size)
        assertEquals("LOCAL_BACKEND plane must have 1 tool", 1, localBackendTools.size)
    }

    @Test
    fun testAIIntentTaxonomyCompleteness() {
        val categories = AIIntentCategory.values()
        assertEquals("Must have 10 canonical AIIntent categories", 10, categories.size)

        val intent = AIIntent(
            category = AIIntentCategory.SEARCH_CATALOG,
            confidence = 0.95f,
            extractedParameters = mapOf("query" to "pizza"),
            rawUtterance = "buscar pizza"
        )
        assertEquals(AIIntentCategory.SEARCH_CATALOG, intent.category)
        assertEquals("pizza", intent.extractedParameters["query"])
    }

    @Test
    fun testAICardsPolymorphism() {
        val productCard = AIProductCard(
            productId = "prod_01",
            businessId = "biz_01",
            businessName = "Pizzeria Napoli",
            name = "Pizza Margarita",
            price = 180.0
        )
        assertEquals(AICardType.PRODUCT_CARD, productCard.cardType)
        assertEquals(180.0, productCard.price, 0.001)

        val businessCard = AIBusinessCard(
            businessId = "biz_01",
            name = "Pizzeria Napoli",
            rating = 4.8
        )
        assertEquals(AICardType.BUSINESS_CARD, businessCard.cardType)

        val orderCard = AIOrderCard(
            orderId = "ord_01",
            businessName = "Pizzeria Napoli",
            status = "in_transit",
            statusLabel = "En camino",
            itemsSummary = "1x Pizza Margarita",
            total = 210.0,
            paymentMethod = "Efectivo"
        )
        assertEquals(AICardType.ORDER_CARD, orderCard.cardType)

        val trackingCard = AITrackingCard(
            orderId = "ord_01",
            status = "in_transit",
            statusLabel = "En camino",
            distanceKm = 1.2,
            etaMinutes = 6,
            isMoving = true
        )
        assertEquals(AICardType.TRACKING_CARD, trackingCard.cardType)
        assertEquals(1.2, trackingCard.distanceKm, 0.001)

        val cardsList: List<AICard> = listOf(productCard, businessCard, orderCard, trackingCard)
        assertEquals(4, cardsList.size)
    }

    @Test
    fun testCustomerAIResponseEnvelope() {
        val response = CustomerAIResponse(
            responseId = "resp_123",
            conversationId = "conv_456",
            message = "Encontré una opción para ti",
            cards = listOf(
                AIProductCard(
                    productId = "p1",
                    businessId = "b1",
                    businessName = "Burger Joint",
                    name = "Doble con Queso",
                    price = 150.0
                )
            ),
            actions = listOf(
                AIAction(
                    actionId = "act_1",
                    actionType = AIActionType.OPEN_PRODUCT,
                    parameters = mapOf("productId" to "p1", "businessId" to "b1")
                )
            ),
            confirmationRequired = false
        )

        assertEquals("resp_123", response.responseId)
        assertEquals(1, response.cards.size)
        assertEquals(1, response.actions.size)
        assertFalse(response.confirmationRequired)
    }

    @Test
    fun testToolResultSeparationInvariant() {
        val result = ToolResult(
            toolId = "tool_search_products",
            status = ToolResultStatus.COMPLETED,
            success = true,
            sanitizedLlmContext = "Se encontraron 2 hamburguesas",
            rawOutputSummary = "Items: [p1, p2]"
        )

        assertTrue(result.success)
        assertEquals("Se encontraron 2 hamburguesas", result.sanitizedLlmContext)
        assertNotEquals(result.sanitizedLlmContext, result.rawOutputSummary)
    }
}
