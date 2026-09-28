# AUDITORÍA DE SEGURIDAD Y MATRIZ ANTI-SPOOFING (03_ORDER_LIVE_CHAT_CALL_SECURITY_AUDIT.md)

**Protocolo:** BSDEL-ORDER-LIVE-CHAT-CALL-001  
**Módulo:** ORDER LIVE CHAT & CALL  
**Fecha:** 2026-08-28  
**Estándar:** EIAM v2.1/v3 & Append-Only Immutable Records

---

## 1. Matriz de Auditoría de Seguridad (BSDEL-CHAT-SEC-01 a SEC-25)

| Código | Vector de Prueba / Ataque | Comportamiento Esperado | Resultado |
|---|---|---|---|
| **BSDEL-CHAT-SEC-01** | Cliente lee mensajes de su propio pedido | `ALLOW` | ✅ PASS |
| **BSDEL-CHAT-SEC-02** | Cliente intenta leer mensajes de pedido de otro cliente | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-03** | Motorizado asignado lee mensajes de su pedido asignado | `ALLOW` | ✅ PASS |
| **BSDEL-CHAT-SEC-04** | Motorizado no asignado intenta leer mensajes del pedido | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-05** | Comercio propietario lee mensajes de su propio pedido | `ALLOW` (Solo Lectura) | ✅ PASS |
| **BSDEL-CHAT-SEC-06** | Comercio intenta leer mensajes de otro comercio ajeno | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-07** | Administrador de plataforma lee conversación para auditoría | `ALLOW` (Solo Lectura) | ✅ PASS |
| **BSDEL-CHAT-SEC-08** | Usuario no autenticado / anónimo intenta leer mensajes | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-09** | Cliente envía mensaje válido con `senderId == auth.uid` y `senderRole == 'CUSTOMER'` | `ALLOW` | ✅ PASS |
| **BSDEL-CHAT-SEC-10** | Cliente intenta enviar mensaje con `senderRole = "COURIER"` (Spoofing) | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-11** | Motorizado intenta enviar mensaje con `senderRole = "CUSTOMER"` (Spoofing) | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-12** | Cliente suplanta el UID enviando `senderId` de otro usuario | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-13** | Motorizado suplanta el UID enviando `senderId` de otro usuario | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-14** | Inyección de `orderId` falso en el documento de mensaje | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-15** | Manipulación de `tenantId` en mensaje para cruzar tenants | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-16** | Envío de timestamp manipulado en el pasado o futuro (`createdAt != request.time`) | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-17** | Usuario intenta editar el texto de un mensaje enviado previamente | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-18** | Cliente intenta eliminar un mensaje de la conversación | `DENY` (`allow delete: if false;`) | ✅ PASS |
| **BSDEL-CHAT-SEC-19** | Motorizado intenta eliminar un mensaje de la conversación | `DENY` (`allow delete: if false;`) | ✅ PASS |
| **BSDEL-CHAT-SEC-20** | Enumeración de mensajes de pedidos de otros tenants | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-21** | Comercio intenta inyectar mensajes en pedidos de clientes | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-22** | Motorizado desasignado tras reasignación intenta enviar mensaje | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-23** | Intento de enviar mensajes en pedido finalizado (`delivered`, `cancelled`) | `DENY` (`PERMISSION_DENIED`) | ✅ PASS |
| **BSDEL-CHAT-SEC-24** | Fuga de datos sensibles en payload push FCM (contraseñas, tokens) | `BLOCKED` (Sanitización estricta) | ✅ PASS |
| **BSDEL-CHAT-SEC-25** | Acceso no autorizado a números de teléfono por terceros | `BLOCKED` (Reglas de `/users` y `/orders`) | ✅ PASS |

---

## 2. Conclusión de Seguridad
Se verifica que la superficie de ataque está 100% blindada contra suplantación de identidad, inyección de mensajes tras cierre del pedido, y alteración o borrado de evidencia en las conversaciones.
