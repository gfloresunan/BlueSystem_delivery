package com.example.enterprise.communication.advanced

enum class WorkflowStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    EXPIRED
}

data class WorkflowStep(
    val stepId: String,
    val delayMs: Long = 0L,
    val actionType: String, // SEND_REMINDER, CANCEL_ORDER, SEND_SURVEY
    val channel: String = "WHATSAPP"
)

data class WorkflowInstance(
    val workflowId: String = "wf_${System.currentTimeMillis()}_${(1000..9999).random()}",
    val orderId: String,
    val customerId: String,
    val steps: List<WorkflowStep>,
    val currentStepIndex: Int = 0,
    val status: WorkflowStatus = WorkflowStatus.SCHEDULED,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Servidor Enterprise: WorkflowCommunicationEngine.
 * Orquestador de flujos de trabajo de comunicación automatizados con retardo temporizado y reglas de decisión.
 */
class WorkflowCommunicationEngine {

    private val activeWorkflows = mutableMapOf<String, WorkflowInstance>()

    fun startWorkflow(orderId: String, customerId: String, steps: List<WorkflowStep>): WorkflowInstance {
        val instance = WorkflowInstance(
            orderId = orderId,
            customerId = customerId,
            steps = steps,
            status = WorkflowStatus.IN_PROGRESS
        )
        activeWorkflows[instance.workflowId] = instance
        return instance
    }

    fun processNextStep(workflowId: String, isConditionMet: Boolean): WorkflowInstance? {
        val current = activeWorkflows[workflowId] ?: return null

        if (current.status != WorkflowStatus.IN_PROGRESS) return current

        if (!isConditionMet) {
            val cancelled = current.copy(status = WorkflowStatus.CANCELLED)
            activeWorkflows[workflowId] = cancelled
            return cancelled
        }

        val nextIndex = current.currentStepIndex + 1
        val updated = if (nextIndex >= current.steps.size) {
            current.copy(currentStepIndex = nextIndex, status = WorkflowStatus.COMPLETED)
        } else {
            current.copy(currentStepIndex = nextIndex)
        }

        activeWorkflows[workflowId] = updated
        return updated
    }

    fun getWorkflow(workflowId: String): WorkflowInstance? = activeWorkflows[workflowId]
}
