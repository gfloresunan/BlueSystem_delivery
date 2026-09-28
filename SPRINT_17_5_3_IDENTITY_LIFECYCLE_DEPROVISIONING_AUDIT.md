# AUDITORÍA FORENSE DE CICLO DE VIDA DE IDENTIDADES & DEPROVISIONING — SPRINT 17.5.3
**BlueSystem Delivery Enterprise v2.2**  
**Fecha de Ejecución:** 17 de Agosto de 2026  
**Auditor:** Senior Developer & Enterprise Systems Auditor  
**Tipo de Auditoría:** READ-ONLY Forensic Investigation  
**Estatus:** 🟢 **AUDITORÍA FORENSE COMPLETADA & IDENTIDADES CLASIFICADAS**  

---

## 1. Objetivo y Metodología Forense

Esta auditoría forense **Read-Only** investigó el historial completo de eventos, membresías, cuentas de autenticación y tenats para determinar si las identidades comerciales asociadas a *Junior Flores*, *Aldrich Flores*, *Kimberly Flores*, *Kim* y *Chepita* fueron deprovisionadas correctamente o si sufrieron una desvinculación anómala.

---

## 2. Hallazgo Forense Clave: Dualidad de Identidad vs Negocio Legacy

> [!IMPORTANT]
> **Causa Raíz de la Confusión:** En la arquitectura legacy v1.x, el identificador del comercio (`businessId`) era idéntico al UID del usuario (`businesses/{uid}`).  
> Durante la migración a la arquitectura **EIAM v2.2 Multi-Tenant** (Sprint 16/17):
> 1. Se crearon comercios canónicos con UUIDs formales (*Variedades TECNOHOME* $\rightarrow$ `e7dc911e-e587-4be9-a741-7d9d9828011f`, *El Chanchito* $\rightarrow$ `bbb760d5-a8f3-4700-9a96-f58f11f345ac`).
> 2. Los documentos comerciales legacy que llevaban el UID del usuario (`businesses/XWNzPT5p...` y `businesses/qtlV8m...`) fueron legítimamente marcados como `DEPROVISIONED`.
> 3. **Los usuarios (Personas) Junior Flores y Aldrich Flores NUNCA fueron dados de baja:** Ambos se migraron exitosamente como **Merchant Owners** activos con sus respectivas `/membership` canónicas en sus nuevos comercios UUID.

---

## 3. Matriz Forense de Clasificación de Identidades

| Identidad | UID / ID | Firebase Auth | `/membership` EIAM | Tenant / Comercio Asociado | Estado Forense | Acción Recomendada |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- |
| **Junior Flores** | `XWNzPT5p6fbf7reFdFBNTZoQrY42` | 🟢 `gflores@unan.edu.ni`<br>(Disabled: NO) | 🟢 `ACTIVE`<br>(Role: `MERCHANT_OWNER`) | 🏪 **Variedades TECNOHOME**<br>(`e7dc911e-e587-4be9-a741-7d9d9828011f`) | 🟢 **ACTIVE OWNER** | **Ninguna** (Comercio y usuario activos y certificados). |
| **Aldrich Flores** | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | 🟢 `ventas@tecnocomp.com.ni`<br>(Disabled: NO) | 🟢 `ACTIVE`<br>(Role: `MERCHANT_OWNER`) | 🏪 **El Chanchito**<br>(`bbb760d5-a8f3-4700-9a96-f58f11f345ac`) | 🟢 **ACTIVE OWNER** | **Ninguna** (Comercio y usuario activos y certificados). |
| **FRITONI Owner** | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | 🟢 `fritonic@gmail.com`<br>(Disabled: NO) | 🟢 `ACTIVE`<br>(Role: `MERCHANT_OWNER`) | 🏪 **FRITONI**<br>(`dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`) | 🟢 **ACTIVE OWNER** | **Ninguna** (Re-provisionado en Sprint 17.5.1). |
| **Kimberly Flores** | `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | 🔴 `kim@gmail.com`<br>(Disabled: **YES**) | ❌ 0 Membresías | 🏢 Ninguno (Legacy `8O8hJe5k...`) | 🔴 **DEPROVISIONED & DISABLED** | **Mantener Deprovisioned** (Baja comercial legítima). |
| **Kim (Legacy)** | `1768243841542` | ❌ No existe en Auth | ❌ 0 Membresías | 🏢 Ninguno (Legacy Test Biz) | 🔴 **DEPROVISIONED** | **Mantener Deprovisioned** (Registro de prueba purgado). |
| **Chepita (Legacy)** | `1769029559449` | ❌ No existe en Auth | ❌ 0 Membresías | 🏢 Ninguno (Legacy Test Biz) | 🔴 **DEPROVISIONED** | **Mantener Deprovisioned** (Registro de prueba purgado). |

---

## 4. Evidencia Extraída de `/audit_events`

### A. Deprovisioning de Comercios Legacy (No de Usuarios)
* **Junior Flores Legacy Biz:**
  * `[2026-08-16T20:17:34.106Z]` Evento `BUSINESS_DEPROVISIONED` sobre `Biz: XWNzPT5p6fbf7reFdFBNTZoQrY42` por Actor `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` (Admin) con motivo *"Acción administrativa desde Governance Center"*.
  * **Efecto Real:** Deprovisionó el documento antiguo `businesses/XWNzPT5p...`, mientras que el usuario continuó activo en `businesses/e7dc911e-e587-4be9-a741-7d9d9828011f` (*Variedades TECNOHOME*).
* **Aldrich Flores Legacy Biz:**
  * `[2026-08-16T19:37:22.391Z]` Evento `BUSINESS_DEPROVISIONED` sobre `Biz: qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` por Admin `XWsjzZe8lsfthRQ5PgbDzlqA2nX2`.
  * **Efecto Real:** Deprovisionó el documento antiguo `businesses/qtlV8m...`, mientras que el usuario continuó activo en `businesses/bbb760d5-a8f3-4700-9a96-f58f11f345ac` (*El Chanchito*).
* **Kimberly Flores:**
  * `[2026-08-12T23:04:41.998Z]` y `[2026-08-16T19:36:18.094Z]` Eventos `BUSINESS_DEPROVISIONED` sobre `Biz: 8O8hJe5kSzNQxUkLwwkCsipGmAI3`. Cuenta de Firebase Auth deshabilitada (`disabled: true`). Baja definitiva.

---

## 5. Formalización del Ciclo de Vida EIAM v2.2

A partir de esta auditoría, el ciclo de vida de identidades y membresías empresariales queda formalizado con la regla invariable:

$$\mathbf{TERMINATED \neq DELETED}$$

```text
                           IDENTITY LIFECYCLE (EIAM v2.2)
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
             ACTIVE                  SUSPENDED               TERMINATED
                 │                       │                       │
                 ▼                       ▼                       ▼
         Membresía: ACTIVE       Membresía: SUSPENDED    Membresía: TERMINATED
         Auth User: Enabled      Auth User: Enabled      Auth User: Disabled/Cleared
         Claims: ON (businessId) Claims: OFF (null)      Claims: OFF (null)
         Acceso: FULL            Acceso: BLOCKED         Acceso: REVOKED
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         ▼
                               /audit_events INMUTABLE
                               (Trazabilidad Histórica)
```

### Reglas de Estado:
1. **`ACTIVE`:** Usuario autenticado con `/membership.status == 'ACTIVE'`, Custom Claims activos (`businessId`, `orgId`, `branchId`), acceso total a Merchant Web.
2. **`SUSPENDED`:** Usuario temporalmente suspendido por Governance Center. Claims revocados a `null`. La membresía persiste para no perder historial de turnos y pedidos.
3. **`TERMINATED`:** Usuario desvinculado permanentemente. La membresía pasa a `status: 'TERMINATED'` con `terminatedAt: serverTimestamp()`. **Bajo ninguna circunstancia se elimina el documento de `/membership`**, garantizando que reportes financieros y auditorías forenses conserven la integridad de auditoría (ADR-003).

---

## 6. Dictamen Final

1. **No existe pérdida ni desvinculación indebida de identidades:** Junior Flores y Aldrich Flores están 100% operativos como Merchant Owners de sus comercios certificados.
2. **Los comercios deprovisionados son únicamente remanentes legacy:** Su estatus `DEPROVISIONED` en `/businesses` es correcto y debe mantenerse.
3. **Kimberly Flores, Kim y Chepita están correctamente deprovisionadas:** No requieren ninguna acción de re-provisionamiento.
