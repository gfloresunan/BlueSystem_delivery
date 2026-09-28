package com.example.enterprise.integration

/**
 * Servidor Enterprise: IntegrationHub (Pilar Enterprise Integration Platform).
 * Orquestador central de conectores externos para comunicaciones, pasarelas de pago, ERPs, BI y Webhooks.
 */
class IntegrationHub {

    private val connectorsMap = mutableMapOf<String, IExternalConnector>()

    init {
        // Registro por defecto de los conectores soportados
        registerConnector(WhatsAppConnector())
        registerConnector(StripeConnector())
        registerConnector(BacLafisePaymentConnector())
        registerConnector(QuickBooksConnector())
        registerConnector(PowerBiLookerConnector())
        registerConnector(ZapierWebhookConnector())
    }

    fun registerConnector(connector: IExternalConnector) {
        connectorsMap[connector.connectorId] = connector
    }

    fun getConnector(connectorId: String): IExternalConnector? {
        return connectorsMap[connectorId]
    }

    suspend fun dispatchExternalAction(
        connectorId: String,
        action: String,
        payload: Map<String, Any>
    ): Result<Map<String, Any>> {
        val connector = connectorsMap[connectorId]
            ?: return Result.failure(IllegalArgumentException("Conector no encontrado: $connectorId"))

        if (!connector.isConnected) {
            return Result.failure(IllegalStateException("Conector desactivado: $connectorId"))
        }

        return connector.executePayload(action, payload)
    }

    fun getActiveConnectorsCount(): Int = connectorsMap.values.count { it.isConnected }
}
