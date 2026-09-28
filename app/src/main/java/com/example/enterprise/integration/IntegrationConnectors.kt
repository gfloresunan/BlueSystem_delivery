package com.example.enterprise.integration

enum class ConnectorCategory {
    COMMUNICATION,
    PAYMENT_GATEWAY,
    ERP_ACCOUNTING,
    BI_ANALYTICS,
    AUTOMATION_WEBHOOKS
}

interface IExternalConnector {
    val connectorId: String
    val name: String
    val category: ConnectorCategory
    val isConnected: Boolean
    suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>>
}

class WhatsAppConnector : IExternalConnector {
    override val connectorId: String = "conn_whatsapp"
    override val name: String = "WhatsApp Business API"
    override val category: ConnectorCategory = ConnectorCategory.COMMUNICATION
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "SENT", "messageId" to "wa_msg_${System.currentTimeMillis()}"))
    }
}

class StripeConnector : IExternalConnector {
    override val connectorId: String = "conn_stripe"
    override val name: String = "Stripe Payment Gateway"
    override val category: ConnectorCategory = ConnectorCategory.PAYMENT_GATEWAY
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "PAID", "chargeId" to "ch_${System.currentTimeMillis()}"))
    }
}

class BacLafisePaymentConnector : IExternalConnector {
    override val connectorId: String = "conn_bac_lafise"
    override val name: String = "BAC / LAFISE Regional Payment Gateway"
    override val category: ConnectorCategory = ConnectorCategory.PAYMENT_GATEWAY
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "APPROVED", "authCode" to "BAC_${(100000..999999).random()}"))
    }
}

class QuickBooksConnector : IExternalConnector {
    override val connectorId: String = "conn_quickbooks"
    override val name: String = "QuickBooks ERP & Accounting"
    override val category: ConnectorCategory = ConnectorCategory.ERP_ACCOUNTING
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "SYNCED", "invoiceId" to "qb_inv_${System.currentTimeMillis()}"))
    }
}

class PowerBiLookerConnector : IExternalConnector {
    override val connectorId: String = "conn_powerbi_looker"
    override val name: String = "Power BI & Google Looker Analytics"
    override val category: ConnectorCategory = ConnectorCategory.BI_ANALYTICS
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "DATASET_UPDATED", "rowsPushed" to (payload["rowCount"] as? Int ?: 1)))
    }
}

class ZapierWebhookConnector : IExternalConnector {
    override val connectorId: String = "conn_zapier_webhook"
    override val name: String = "Zapier & Custom Webhooks Engine"
    override val category: ConnectorCategory = ConnectorCategory.AUTOMATION_WEBHOOKS
    override var isConnected: Boolean = true

    override suspend fun executePayload(action: String, payload: Map<String, Any>): Result<Map<String, Any>> {
        return Result.success(mapOf("status" to "TRIGGERED", "webhookId" to "wh_${System.currentTimeMillis()}"))
    }
}
