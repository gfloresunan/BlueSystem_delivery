# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE MIGRACIÓN DE SINCRONIZACIÓN OFFLINE (OFFLINE SYNC MIGRATION PLAN)

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. ANÁLISIS DE RIESGO DE CONTAMINACIÓN DE COLA OFFLINE

La auditoría de seguridad identificó el siguiente escenario de riesgo crítico en Room SQLite:
- Un **Usuario A** crea una acción u orden offline (`PendingActionEntity`).
- El dispositivo pierde conexión y el **Usuario A** cierra sesión.
- Un **Usuario B** (de un comercio u organización diferente) inicia sesión en la misma app Android.
- El `SyncWorker` se ejecuta en segundo plano al reconectar y procesa la cola local del **Usuario A** utilizando el token JWT activo del **Usuario B**.

---

### 2. PLAN DE EVOLUCIÓN DE ENTIDADES ROOM (`AppDatabase.kt`)

#### 2.1 Actualización de Esquema en Room
- **`OfflineOrderEntity`:**
  ```kotlin
  @Entity(tableName = "offline_orders")
  data class OfflineOrderEntity(
      @PrimaryKey val id: String,
      val orgId: String?,          // MIGRACIÓN CANÓNICA
      val businessId: String,
      val branchId: String?,       // MIGRACIÓN CANÓNICA
      val creatorUid: String,      // IDENTIFICADOR DE AUTOR (PREVENCIÓN CROSS-USER)
      val payloadJson: String,
      val timestamp: Long,
      val syncStatus: String
  )
  ```
- **`PendingActionEntity`:**
  ```kotlin
  @Entity(tableName = "pending_actions")
  data class PendingActionEntity(
      @PrimaryKey val id: String,
      val orgId: String?,
      val businessId: String,
      val branchId: String?,
      val creatorUid: String,      // VÍNCULO OBLIGATORIO DE SESIÓN
      val actionType: String,
      val payloadJson: String,
      val createdAt: Long
  )
  ```

---

### 3. PROTOCOLO SEGURIDAD EN SYNC ENGINE (`SyncManager.kt` & `SyncWorker.kt`)

1. **Filtro de Aislamiento de Sesión:**  
   Al ejecutar `SyncWorker`, la cola de sincronización consulta explícitamente:
   `WHERE creatorUid == currentActiveUid`.
2. **Rechazo de Acciones Huérfanas por Cambio de Usuario:**  
   Si la sesión activa no coincide con `creatorUid`, la cola pospone la sincronización o requiere re-autenticación del autor original, impidiendo que el evento termine sincronizado en el comercio de otro usuario.
