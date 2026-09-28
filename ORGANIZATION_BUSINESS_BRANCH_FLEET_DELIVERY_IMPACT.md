# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — EVALUACIÓN DE IMPACTO EN FLEET CORE & DELIVERY PLATFORM

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. REGLA ESPECIAL SOBRE COMPONENTES PROTEGIDOS

Se ratifica la **Directiva de Protección Absoluta** sobre la plataforma **Fleet Core & Delivery System**:
- `Tracking Visual Realtime` ([ClienteTrackingMap.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/ClienteTrackingMap.kt))
- `Ruta Planificada` ([RutaActivaScreen.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/RutaActivaScreen.kt))
- `Mapa Merchant` ([MapaGlobalAdmin.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/MapaGlobalAdmin.kt))
- `Motor de Asignación de Motorizados` ([SmartCourierAssignmentEngine.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/domain/engine/orders/SmartCourierAssignmentEngine.kt))

---

### 2. MATRIZ DE INDEPENDENCIA OPERATIVA Y COMPATIBILIDAD

| Componente de Flota | Campo Requerido | ¿Requiere `orgId`? | Impacto por Migración Canónica | Riesgo |
| :--- | :--- | :--- | :--- | :--- |
| **Tracking GPS Realtime** | `orderId`, `courierId`, `location` | 🔴 **NO** | Ninguno. El rastreo es puramente punto a punto (`Courier -> Customer`). | **NINGUNO (0%)** |
| **Smart Courier Assignment** | `orderId`, `businessId`, `location` | 🔴 **NO** | Ninguno. Opera sobre la posición de la sucursal (`Branch.location`) o comercio (`Business.location`). | **NINGUNO (0%)** |
| **Push Notifications FCM** | `fcmToken`, `orderId`, `status` | 🔴 **NO** | Ninguno. Se envían vía `NotificationDispatcher.kt` basados en el evento del pedido. | **NINGUNO (0%)** |
| **Proof of Delivery (POD)** | `orderId`, `courierId`, `photoUrl` | 🔴 **NO** | Ninguno. Guarda evidencia asociada a `orderId`. | **NINGUNO (0%)** |

---

### 3. CONCLUSIÓN ARQUITECTÓNICA DE FLOTA
Fleet Core y los algoritmos de despacho **son inmunes a la migración de jerarquía**. Funcionan mediante enlaces directos a `orderId` y coordenadas geográficas. La incorporación de `orgId` a los documentos de órdenes NO altera el comportamiento de la flota.
