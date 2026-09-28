# 02 — ACCOUNT STATUS SCHEMA RECONCILIATION

**Proyecto:** BlueSystem Delivery Android  
**Módulo:** EIAM / Branch Domain & Data Access Layer  

---

## 1. Mapeo de Contrato Multi-Capa

```
Firestore (/branches/{branchId}.status)
        │
        ▼
   "OPERATIONAL" | "ACTIVE" | null / undefined | "CUSTOM_UNKNOWN"
        │
        ▼
AccountStatus.fromString(rawStatus, defaultStatus = ACTIVE)
        │
        ▼
AccountStatus.OPERATIONAL / AccountStatus.ACTIVE / AccountStatus.UNKNOWN
        │
        ▼
Branch.status (Kotlin Model)
        │
        ▼
SmartBranchRouter / FleetEligibilityEngine (evaluación mediante branch.status.isOperational)
        │
        ▼
ComercioDetalleViewModel / Customer UI (Sucursales abiertas y disponibles sin crash)
```

---

## 2. Reconciliación por Valor

| Firestore Value | Normalized `AccountStatus` | `isOperational` | Descripción / Comportamiento |
|---|---|---|---|
| `"ACTIVE"` | `AccountStatus.ACTIVE` | `true` | Sucursal activa y operativa. |
| `"OPERATIONAL"` | `AccountStatus.OPERATIONAL` | `true` | Sucursal física operativa (canónico backend). |
| `null` / `undefined` | `AccountStatus.ACTIVE` | `true` | Fallback seguro para sucursales legacy sin campo status. |
| `""` (String vacío) | `AccountStatus.ACTIVE` | `true` | Fallback seguro para campos mal formateados. |
| `"SUSPENDED"` | `AccountStatus.SUSPENDED` | `false` | Sucursal suspendida administrativamente. |
| `"BLOCKED"` | `AccountStatus.BLOCKED` | `false` | Sucursal bloqueada por seguridad. |
| `"TERMINATED"` | `AccountStatus.TERMINATED` | `false` | Sucursal dada de baja. |
| `"CUALQUIER_OTRO"` | `AccountStatus.UNKNOWN` | `false` | Fallback defensivo que evita un Fatal Exception. |

---

## 3. Logcat Normalization Tag Contract

Cuando se detecta un estado no mapeable hacia un enum canónico estándar, la app registra:

```
W/EIAM_STATUS_NORMALIZATION: rawStatus=CUALQUIER_OTRO normalizedStatus=UNKNOWN source=branches
```

Sin exponer información sensible ni bloquear la interfaz de usuario.
