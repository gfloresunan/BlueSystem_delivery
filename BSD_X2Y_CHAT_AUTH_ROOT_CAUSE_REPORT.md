# BSD-X2Y-CHAT-AUTH-ROOT-CAUSE-REPORT

## 1. INCIDENTE OBSERVADO
- **Customer App**: Abre el chat correctamente, muestra el nombre del motorizado y puede enviar mensajes (ej. "Hola").
- **Courier App**: Muestra un error de "Acceso Denegado" (`permission-denied` de Firestore) al intentar abrir el "Chat de Entrega". No puede leer los mensajes enviados por el cliente.

## 2. HALLAZGOS FORENSES (CHAT)

### A. Falta de Coincidencia de Rutas (Path Mismatch) o Falta de Reglas
- Al buscar en `firestore.rules`, la estructura canónica original fue diseñada para pedidos de comercio (por ejemplo, `/orders/{orderId}/chat_messages/{messageId}`).
- El módulo de Delivery Express X→Y opera bajo una colección distinta (ej. `/deliveryTrips`).
- **Customer App** parece estar escribiendo/leyendo mensajes en una colección para la que **sí** tiene permisos implícitos (tal vez porque su UID coincide con el creador del documento padre o porque la ruta usada es genérica).
- **Courier App** está intentando suscribirse (`onSnapshot`) a la colección de mensajes de ese viaje, pero `firestore.rules` **no** tiene un bloque explícito de autorización que permita a un usuario con rol de `COURIER` y cuyo `uid` coincida con `assignedCourierId` leer/escribir en `/deliveryTrips/{tripId}/...`. Al faltar la regla, Firestore deniega el acceso por defecto.

### B. Fallo de Autorización (Rule Evaluation)
- La regla debe validar explícitamente la propiedad compartida:
  - Permitir a `request.auth.uid == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.customerId`
  - Permitir a `request.auth.uid == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.assignedCourierId`
- Actualmente el Courier falla en esta evaluación, resultando en la desconexión del Listener.

### C. Duplicación Potencial o Ausencia de Chat Unificado
- La evidencia sugiere que el Customer App asume una ruta y el Courier App asume otra, o la seguridad no cubre la ruta de X→Y.

## 3. SOLUCIÓN QUIRÚRGICA PROPUESTA
- Estandarizar la colección de mensajes del viaje (ej: `/deliveryTrips/{tripId}/messages`).
- Añadir a `firestore.rules` un bloque explícito para `/deliveryTrips/{tripId}/messages/{messageId}` que implemente Autorización Basada en Participante (Participant-Based Authorization):
```text
match /deliveryTrips/{tripId}/messages/{messageId} {
  allow read, write: if isAuthenticated() && (
      request.auth.uid == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.customerId ||
      request.auth.uid == get(/databases/$(database)/documents/deliveryTrips/$(tripId)).data.assignedCourierId ||
      getRole() == 'SUPER_ADMIN'
  );
}
```
- Modificar los ViewModels / Repositories en Android para que **ambos** (Customer y Courier) utilicen exactamente este mismo `conversationId` (`tripId`) para viajes X→Y.
