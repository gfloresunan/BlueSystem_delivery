# Enterprise Event Bus Specification

`EnterpriseEventBus` ofrece comunicación asíncrona desacoplada basada en el patrón Publicador/Suscriptor (Pub/Sub).

## Eventos Principales
- `OrderCreated`
- `InventoryReserved`
- `KitchenStarted`
- `KitchenReady`
- `DispatchAssigned`
- `OrderDelivered`

## Ejemplo de Uso
```kotlin
val eventBus = EnterpriseEventBus()
eventBus.subscribe(OrderCreatedEvent::class.java) { evt ->
    println("Nuevo pedido recibido: ${evt.orderId}")
}
```
