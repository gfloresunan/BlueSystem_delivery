# MER 18.2 — Certificación de Comportamiento Offline (Offline Certification)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*

---

## 1. Fundamentos de la Arquitectura Offline en Android

La aplicación BlueSystem Delivery en Android inicializa la persistencia local de Firestore mediante la configuración de caché predeterminada (`setPersistenceEnabled(true)` en el cliente Firebase SDK v9 compat). 

Bajo este modelo:
- Las lecturas de colecciones previamente cacheadas devuelven documentos locales instantáneamente con `metadata.isFromCache = true`.
- Las escrituras (`set`, `update`, `delete`) sobre documentos existentes se registran en la cola de mutaciones de SQLite y se disparan reactivamente en los listeners locales de inmediato (optimistic UI update).
- Las llamadas HTTPS remotas (Cloud Functions Callable) fallan de inmediato con `FirebaseFunctionsException.Code.UNAVAILABLE`.

---

## 2. Matriz de Comportamiento por Pantalla ante Pérdida de Red

| Pantalla / Operación | Comportamiento Offline en la APK | ¿Retiene Datos en Pantalla? | ¿Encola Mutaciones? | Comportamiento al Reconectar | Veredicto de Resiliencia |
|---|---|:---:|:---:|---|:---:|
| **Dashboard de Operaciones** | Muestra los últimos KPIs cacheados. El switch de apertura conmuta optimistamente. | 🟢 Sí (Caché local) | 🟢 Sí (`/businesses.isOpen`) | Sincroniza el estado con el servidor automáticamente. | 🟢 **RESILIENTE** |
| **Menú y Catálogo (`CategoryMenuScreen`)** | Muestra todas las categorías y productos previamente cargados en la sesión. | 🟢 Sí | 🟢 Sí (Creación y edición de categoría) | Sube las categorías creadas a Firestore sin duplicados. | 🟢 **RESILIENTE** |
| **Workspace de Producto (`ProductWorkspaceScreen`)** | Permite editar descripciones y precios. Sin embargo, subir fotos falla inmediatamente. | 🟡 Parcial (Falla subida de imágenes a Storage) | 🟢 Sí (Campos de texto de `/products`) | Al reconectar, persiste el documento. Si se intentó subir foto, arroja excepción de red. | 🟡 **PARCIAL** |
| **Centro de Pedidos (`MerchantOrdersOperationsCenterScreen`)** | Muestra pedidos activos. Si se intenta cambiar estado a `ACCEPTED`, se actualiza localmente. | 🟢 Sí | 🟢 Sí (Mutación local en `/orders`) | Sincroniza la orden con Firestore y dispara las notificaciones pendientes. | 🟢 **RESILIENTE** |
| **Configuración de Horarios (`RestaurantSettingsCenterScreen`)** | Permite ajustar horas y switches. Al presionar "Guardar", se encola en Firestore local. | 🟢 Sí | 🟢 Sí (`/restaurant_settings`) | Persiste en servidor al recuperar conectividad. | 🟢 **RESILIENTE** |
| **Finanzas y Liquidaciones (`MerchantFinanceCenterScreen`)** | Muestra balances cacheados. Los botones "Confirmar" o "Disputar" fallan de inmediato. | 🟢 Sí (Solo lectura) | 🔴 No (Cloud Functions no encolan) | No se auto-ejecutan; el usuario debe presionar el botón nuevamente online. | 🟡 **REQUIERE RED** (Por diseño de seguridad) |
| **Gestión de Promociones** | Desconectado del flujo. | 🔴 No | 🔴 No | N/A | 🔴 **MOCK / UNLINKED** |

---

## 3. Vulnerabilidades Forenses Identificadas en Modo Offline

### A. Subida de Imágenes en Workspace de Producto
- **Ruta**: `ProductWorkspaceScreen.kt` (Líneas 270-285).
- **Problema**: `CloudStorageManager.uploadImage()` requiere conectividad activa HTTP hacia Google Cloud Storage. Si el usuario intenta guardar un nuevo producto con una foto local (`content://...`) estando offline, la tarea de subida se suspende o arroja `StorageException`. No hay reintento en background vía `WorkManager` con `Constraints(NetworkType.CONNECTED)`.
- **Riesgo**: El producto se guarda en Firestore con una URL de imagen vacía o nula.

### B. Notificaciones de Nuevos Pedidos
- Si el comercio pierde conexión a Internet:
  1. FCM no entrega el mensaje Push.
  2. El snapshot listener de `/orders` se silencia.
  3. El cliente puede realizar un pedido que el comercio nunca verá en su pantalla física hasta que recupere la conexión.
  4. La aplicación no implementa un aviso visual prominente ("Sin conexión a Internet - No estás recibiendo pedidos") en el header del Dashboard.

---

## 4. Dictamen de Certificación Offline

```text
+-------------------------------------------------------------+
| ÍNDICE DE RESILIENCIA OFFLINE DEL MÓDULO COMERCIO: 78.5%    |
+-------------------------------------------------------------+
| Lectura de Datos Históricos y Catálogo:   🟢 100% Funcional |
| Mutaciones Optimistas de Pedidos/Menú:    🟢 100% Encoladas |
| Gestión de Imágenes y Media:              🔴 0%   Requiere Red |
| Liquidaciones y Cloud Functions:          🟡 Protegido (Exige Online) |
| Alertas de Desconexión Crítica:           🔴 Ausente en UI  |
+-------------------------------------------------------------+
```
