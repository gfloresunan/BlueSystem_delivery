package com.example.enterprise.communication.advanced

import com.example.enterprise.communication.CommunicationChannel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class Sprint14_5E2ETest {

    private val templateStudio = TemplateStudioEngine()
    private val workflowEngine = WorkflowCommunicationEngine()
    private val preferenceCenter = UserPreferenceCenter()
    private val analyticsPlatform = CommunicationAnalyticsPlatform()

    @Test
    fun `E2E Sprint 14_5 - Full Advanced ECP Expansion Validation`() {
        // 1. Plantilla diseñada en Template Studio
        val template = StudioTemplate("t_reminder", "Recordatorio {orderId}", htmlBody = "<p>Paga tu pedido {orderId}</p>")
        templateStudio.saveTemplate(template)
        val rendered = templateStudio.renderTemplate("t_reminder", mapOf("orderId" to "ord_555"))
        assertEquals("Recordatorio ord_555", rendered?.first)

        // 2. Orquestación de Flujo Temporizado
        val steps = listOf(WorkflowStep("s1", actionType = "REMIND", channel = "WHATSAPP"))
        val wf = workflowEngine.startWorkflow("ord_555", "cust_99", steps)
        assertEquals(WorkflowStatus.IN_PROGRESS, wf.status)

        // 3. Matriz de Preferencias de Usuario
        val isAllowed = preferenceCenter.isChannelAllowed("cust_99", NotificationCategory.ORDERS, CommunicationChannel.WHATSAPP)
        assertTrue(isAllowed)

        // 4. Registro de Analítica y Reporte
        analyticsPlatform.recordEvent(CommunicationEventRecord("msg_555", CommunicationChannel.WHATSAPP, isDelivered = true, isOpened = true))
        val report = analyticsPlatform.generateReport()
        assertEquals(100.0, report.openRate, 0.1)
    }
}
