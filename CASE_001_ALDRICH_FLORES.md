# FASE H — EXPEDIENTE ESPECIAL CASE-001: ALDRICH FLORES

**Sujeto de Estudio:** Aldrich Flores  
**Clasificación:** `ACCOUNT_SPLIT_BY_SYSTEM`  
**Estatus:** **NO ACTION TAKEN (Modo Solo Lectura)**  

---

## 1. Comparativa de Identidades Detectadas

| Atributo | Identidad A (EIAM Business) | Identidad B (POS Client Legacy) |
| :--- | :--- | :--- |
| **UID / Document ID** | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | `user_cli_1768237897386` |
| **Nombre Registrado** | `Aldrich Flores` (en `nombre` y `name`) | `Aldrich  Flores` (únicamente en `name`) |
| **Email Registrado** | `ventas@tecnocomp.com.ni` | *(sin email, username: aflores26)* |
| **Teléfono Registrado** | `+50582397401` | *(sin teléfono)* |
| **Rol Canónico** | `business` (`MERCHANT_OWNER`) | `customer` (`CLIENT` POS) |
| **Organización ID** | `1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8` | N/A |
| **Comercio ID** | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` | N/A |
| **Sucursal ID** | `30945c9c-3aee-4e45-b35d-a998b57cf2fa` | N/A |
| **Cliente POS ID** | N/A | `cliente0003_2026` |
| **Origen del Registro** | Onboarding Canónico Merchant (ADR-011) | Sincronización de Punto de Venta (POS) Escritorio |
| **Visibilidad Prev-G** | Visible en Governance y Admin Web | Visible únicamente en Governance Center |
| **Visibilidad Post-G** | Visible en Governance y Admin Web | Visible en Governance y Admin Web (`Legacy/POS`) |

---

## 2. Dictamen Forense

* **Origen de la Separación:** La Identidad A fue creada formalmente durante el onboarding de comercio para gestionar el negocio *Tecnocomp*. La Identidad B fue generada automáticamente por la aplicación de caja POS de escritorio al registrar una compra a nombre del cliente "Aldrich Flores" sin vincular la cuenta EIAM de administración.
* **Criterio de Seguridad:** Ambas cuentas deben mantenerse **independientes e intactas**. No se debe realizar una fusión de cuentas automáticas sin la debida confirmación del usuario para evitar asociar compras de cliente con permisos administrativos de comercio.

---

## 3. Acción Recomendada para FASE I

```text
RECOMMENDED ACTION: LINK (Vinculación Lógica en Lectura)
Confidence: HIGH
Preconditions for future action:
1. Mantener ambos documentos en Firestore intactos.
2. En la FASE I, permitir una asociación lógica en UI (cross-reference) para que el Panel de Control muestre las compras POS realizadas por el propietario del comercio.
```
