package com.example.enterprise.communication

/**
 * Servidor Enterprise: CommunicationTemplateEngine.
 * Formatea dinámicamente títulos y cuerpos de mensajes sustituyendo variables de contexto.
 */
class CommunicationTemplateEngine {

    private val templates = mapOf(
        "ORDER_CONFIRMED" to Pair("Pedido Confirmado", "Tu pedido {orderId} por C${'$'}{total} ha sido recibido y confirmado."),
        "KITCHEN_PREPARING" to Pair("En Preparación", "La cocina ha comenzado a preparar tu pedido {orderId}."),
        "KITCHEN_READY" to Pair("Pedido Listo", "Tu pedido {orderId} está listo para ser despachado."),
        "DISPATCH_ASSIGNED" to Pair("Repartidor Asignado", "El repartidor {driverName} llevará tu pedido {orderId}."),
        "ORDER_DELIVERED" to Pair("Pedido Entregado", "Tu pedido {orderId} ha sido entregado exitosamente. ¡Buen provecho!")
    )

    fun renderTemplate(templateKey: String, variables: Map<String, Any>): Pair<String, String>? {
        val (rawTitle, rawBody) = templates[templateKey] ?: return null

        var formattedTitle = rawTitle
        var formattedBody = rawBody

        variables.forEach { (key, value) ->
            formattedTitle = formattedTitle.replace("{$key}", value.toString())
            formattedBody = formattedBody.replace("{$key}", value.toString())
        }

        return Pair(formattedTitle, formattedBody)
    }
}
