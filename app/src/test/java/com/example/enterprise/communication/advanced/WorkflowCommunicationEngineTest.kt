package com.example.enterprise.communication.advanced

import org.junit.Assert.assertEquals
import org.junit.Test

class WorkflowCommunicationEngineTest {

    private val workflowEngine = WorkflowCommunicationEngine()

    @Test
    fun `test timed workflow steps execution and cancellation when condition fails`() {
        val steps = listOf(
            WorkflowStep("step1", delayMs = 600_000L, actionType = "SEND_REMINDER", channel = "WHATSAPP"),
            WorkflowStep("step2", delayMs = 600_000L, actionType = "CANCEL_ORDER", channel = "IN_APP")
        )

        val wf = workflowEngine.startWorkflow("ord_1", "cust_1", steps)
        assertEquals(WorkflowStatus.IN_PROGRESS, wf.status)

        // Paso 1 procesado si el pago no se ha realizado
        val step1Res = workflowEngine.processNextStep(wf.workflowId, isConditionMet = true)
        assertEquals(1, step1Res?.currentStepIndex)

        // Paso 2 cancelado porque el usuario ya pagó
        val step2Res = workflowEngine.processNextStep(wf.workflowId, isConditionMet = false)
        assertEquals(WorkflowStatus.CANCELLED, step2Res?.status)
    }
}
