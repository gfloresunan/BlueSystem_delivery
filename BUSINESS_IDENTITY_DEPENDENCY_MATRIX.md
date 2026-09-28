# FASE H — MATRIZ DE DEPENDENCIAS ORGANIZACIONALES Y DE COMERCIO

**Fase:** FASE H — Reconciliación de Identidades  
**Dominio:** Identidades Business, Comercios, Sucursales y Organizaciones EIAM  

---

## 1. Matriz de Identidades Business y sus Referencias

| UID Usuario | Nombre Efectivo | Email | Rol EIAM | Organization ID | Business ID | Branch ID | Estado Comercio | Integridad Referencial |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | `ventas@tecnocomp.com.ni` | `MERCHANT_OWNER` | `1b485c29-b7e3-4173-a4fd-36f8bb4ec1e8` | `bbb760d5-a8f3-4700-9a96-f58f11f345ac` | `30945c9c-3aee-4e45-b35d-a998b57cf2fa` | ACTIVO | **VALIDA (ADR-011)** |
| `7dM304kPlM39zK11xL08vJ29kP0` | Comercio Demo 1 | `comercio1@bluesystem.com` | `business` | N/A | `biz_demo_1` | N/A | ACTIVO | **VALIDA** |
| `8eN415lQmN40aL22yM19wK30lQ1` | Comercio Demo 2 | `comercio2@bluesystem.com` | `business` | N/A | `biz_demo_2` | N/A | ACTIVO | **VALIDA** |
| `S4me675bB4f83zO77mY64kb85bf7` | *(vendedor 1)* | *(sin email)* | `SELLER` | N/A | N/A | N/A | N/A | **REFERENTIAL_INTEGRITY_RISK** |
| `T5nf786cC5g94zP88nZ75lc96cg8` | *(vendedor 2)* | *(sin email)* | `SELLER` | N/A | N/A | N/A | N/A | **REFERENTIAL_INTEGRITY_RISK** |

---

## 2. Diagnóstico de Gobernanza

* **Integridad Canónica Confirmada:** La cuenta principal del propietario de comercio (`qtlV8m8wj0ed0tQFXKzjfXKzQ5g2`) cumple al 100% con la arquitectura canónica reconciliada en ADR-011 (`Organization` $\rightarrow$ `Business` $\rightarrow$ `Branch`).
* **Protección Absoluta:** Bajo ninguna circunstancia se debe marcar ninguna identidad Business como candidata a eliminación mientras posea vínculos con comercios o sucursales activas.
