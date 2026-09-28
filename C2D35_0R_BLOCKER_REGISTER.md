# BLUE SYSTEM DELIVERY ENTERPRISE
## C2D.35.0-R — REGISTRO REMEDIADO DE BLOQUEADORES (BLOCKER REGISTER)
**Master Remediation Blocker Register & Architectural Defect Resolution**

- **Protocolo Oficial:** `BSD-C2D35.0R-BLOCKER-REGISTER-001`
- **Fase:** POST-C2D.35.0 / PRE-C2D.35.1
- **Autoridad:** C2D.34A Baseline & C2D.35.0-R Remediation
- **Modo:** `READ-ONLY AUDIT & STATUS VERIFICATION`
- **Fecha:** 3 de Septiembre de 2026

---

## 1. PRINCIPIO DE GOBERNANZA DE BLOQUEADORES EN C2D.35.0-R

Un bloqueador en esta fase de remediación se clasifica en dos dimensiones inconfundibles:
1. **Bloqueador Arquitectónico / Contractual:** Defecto o ambigüedad conceptual en contratos, interfaces o modelos que impedía autorizar la codificación.  
   $\implies$ **TODOS HAN SIDO RESUELTOS Y CLAUSURADOS EN C2D.35.0-R.**
2. **Bloqueador Físico de Código en Repositorio:** Ausencia de código o vulnerabilidad real en los archivos del sistema que debe ser corregida físicamente en C2D.35.1.  
   $\implies$ **MAPEOS EXACTOS Y RESOLUCIONES PREPARADAS PARA EJECUCIÓN.**

---

## 2. MATRIZ INTEGRAL DE BLOQUEADORES ACTUALIZADA

| ID | Título del Blocker | Severidad | Evidencia Física / Origen | Decisión C2D.34A | Estado Arquitectónico (C2D.35.0-R) | Estado en Código (Pre-C2D.35.1) | Workstream Asignado |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| **BLK-35-01** | Lectura Global de `/users` en Rules | 🔴 **P0** | `firestore.rules` L204-209 | DEC-14 / DEC-25 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-1-SEC** |
| **BLK-35-02** | Auto-escalación de `tenantId` en Rules | 🔴 **P0** | `firestore.rules` L214-217 | DEC-14 / DEC-25 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-1-SEC** |
| **BLK-35-03** | Exposición Cross-Tenant de Balances de Repartidor | 🔴 **P0** | `firestore.rules` L1180-1186 | DEC-14 / DEC-25 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-1-SEC** |
| **BLK-35-04** | Gatekeeper Desconectado del Runtime | 🔴 **P0** | `gatekeeper.ts` (0 callers en runtime) | DEC-01 / DEC-03 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-2-RT** |
| **BLK-35-05** | Inexistencia Física de `/usage_counters` | 🔴 **P0** | Ausente en todo el repositorio | DEC-08 / DEC-06 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-4-QTA** |
| **BLK-35-06** | Mutación Directa Client-Side de Suscripciones | 🔴 **P1** | `subscriptionManager.js` L811 | DEC-13 / DEC-23 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-3-SUB / WS-7** |
| **BLK-35-07** | Contradicción en Gracia de `PAST_DUE` (5 días) | 🔴 **P1** | `gatekeeper.ts` L57-59 | DEC-02 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-2-RT** |
| **BLK-35-08** | Creación Directa de Órdenes sin Gatekeeper | 🔴 **P0** | `firestore.rules` L604, `FirebaseManager.kt:256` | DEC-01 / DEC-03 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-6-ORD** |
| **BLK-35-09** | Aprovisionamiento Confinado a Mock en Memoria | 🔴 **P1** | `firestoreProvisioningAdapter.ts` | DEC-09 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-5-PRV** |
| **BLK-35-10** | Fallback Inseguro a Enterprise en Dominios Raíz | 🟠 **P2** | `tenantDomainResolver.ts` L164 | DEC-16 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-2-RT** |
| **BLK-35-11** | Mutación y Purga de `/audit_events` en Rules | 🟠 **P2** | `firestore.rules` L836 | DEC-22 / DEC-14 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-1-SEC** |
| **BLK-35-12** | Cadenas Legadas Decorativas en Admin Web | 🟡 **P3** | `governanceCenter.js` L584-586 | DEC-17 | 🟢 **CONTRACT SEALED** | 🔴 PENDIENTE CÓDIGO | **WS-7-UI** |
| **BLK-35-13** | **Falso Sharding Físico (Campos en 1 Documento)** | 🔴 **P0** | Borrador preliminar de cuotas | DEC-08 | 🟢 **RESOLVED IN RF-01** | 🔴 PENDIENTE CÓDIGO | **WS-4-QTA** |
| **BLK-35-14** | **Semántica de Reserva de Cuota Incompleta** | 🔴 **P1** | Ausencia de ciclo reserve/commit/sweep | DEC-08 / DEC-06 | 🟢 **RESOLVED IN RF-02** | 🔴 PENDIENTE CÓDIGO | **WS-4-QTA** |
| **BLK-35-15** | **Ambigüedad en Autoridad de Custom Claims** | 🔴 **P1** | Riesgo de confianza en token stale | DEC-05 | 🟢 **RESOLVED IN RF-03** | 🔴 PENDIENTE CÓDIGO | **WS-2 / WS-3** |
| **BLK-35-16** | **Uso de Trigger Post-Commit como Compuerta Preventiva** | 🔴 **P1** | Confusión entre `onCreate` y pre-commit | DEC-03 / DEC-10 | 🟢 **RESOLVED IN RF-04** | 🔴 PENDIENTE CÓDIGO | **WS-6-ORD** |
| **BLK-35-17** | **Ambigüedad en Resolver de Período de Facturación** | 🔴 **P1** | Conflicto potencial `YYYYMM` vs ciclo | DEC-07 | 🟢 **RESOLVED IN RF-05** | 🔴 PENDIENTE CÓDIGO | **WS-4-QTA** |
| **BLK-35-18** | **Inclusión No Aprobada de `maxProducts`** | 🔴 **P1** | Referencia accidental en matrices | DEC-06 | 🟢 **RESOLVED IN RF-06** | 🔴 PENDIENTE CÓDIGO | **WS-4-QTA** |

---

## 3. ESTADO DE LOS BLOQUEADORES P0 Y P1

- **Bloqueadores de Definición Arquitectónica (RF-01 a RF-07 / BLK-35-13 a BLK-35-18):**  
  **100% CERRADOS DOCUMENTALMENTE.** No queda ninguna duda abierta sobre contratos, esquemas físicos ni algoritmos.
- **Bloqueadores de Implementación de Código (BLK-35-01 a BLK-35-12):**  
  Permanecen formalmente **ABIERTOS FÍSICAMENTE EN EL CÓDIGO**, tal como exige la regla de no mutación de C2D.35.0-R, pero están **100% DESBLOQUEADOS Y LISTOS PARA SER RESUELTOS EN C2D.35.1**.
