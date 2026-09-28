# OPERATIONAL IDENTITY RECONCILIATION REPORT — BLUESYSTEM ENTERPRISE v2.2

## 1. Resumen Ejecutivo

Este documento constituye el informe definitivo de reconciliación de la población de identidades en BlueSystem Enterprise. Se identificaron **44 documentos físicos** en la colección `/users` de Firestore. Tras evaluar objetivamente cada uno de los registros frente a fuentes reales de evidencia (aplicaciones de comercios, historial de ventas, registros de dispositivos `user_devices`, audit logs y autenticación), se determinó que la población legítima operacional consta de exactamente **13 identidades operacionales**.

| Categoría Canónica | Conteo Reconciliado | Descripción de la Población |
| :--- | :---: | :--- |
| **`APP`** | **4** | Identidades creadas mediante la App móvil (Clientes y Motorizados activos con dispositivo registrado/pedidos). |
| **`ADMIN_PANEL`** | **2** | Usuarios de administración del sistema provistos desde el Panel Admin Web (`XWsjzZe8lsfthRQ5PgbDzlqA2nX2` y `admin_initial`). |
| **`AFFILIATION`** | **7** | Propietarios de comercio y personal vendedor creados mediante solicitudes de afiliación, onboarding ADR-011 o creación comercial en el sistema de ventas. |
| **TOTAL OPERACIONAL** | **13** | **Población activa legítima en Usuarios & Roles y Governance Center.** |
| `TEST` | 3 | Registros sintéticos de pruebas automatizadas y fixtures (`test_*`). Excluidos. |
| `LEGACY_PREEXISTING` | 28 | Perfiles históricos estáticos creados por la migración del POS de escritorio sin autenticación, correo ni actividad operacional. Excluidos. |
| `UNKNOWN` | 0 | Identidades sin origen clasificado. (0 pendientes). |
| **TOTAL FÍSICO /users** | **44** | **100% de documentos físicos auditados y reconciliados.** |

---

## 2. Matriz Definitiva de Reconciliación (44 Usuarios)

### 2.1 Población Operacional Legítima (13 Identidades)

| # | UID | Nombre Efectivo | Rol Canónico | `identityOrigin` | `createdVia` | Evidencia de Origen Obtenida |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` | Gerald Flores | `admin` | `ADMIN_PANEL` | `ADMIN_PANEL` | Registro administrativo EIAM, 8 eventos de auditoría y dispositivo Android. |
| 2 | `admin_initial` | Admin Gerald Flores | `ADMIN` | `ADMIN_PANEL` | `ADMIN_PANEL` | Cuenta administrativa inicial con 256 ventas registradas en la colección `sales`. |
| 3 | `XWNzPT5p6fbf7reFdFBNTZoQrY42` | Junior Flores | `MERCHANT_OWNER` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Solicitud de afiliación `rkul8qqr6ljKyf8W7eXW` y comercio `e7dc911e-e587-4be9-a741-7d9d9828011f`. |
| 4 | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | `MERCHANT_OWNER` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Solicitud de afiliación `McIq7vqVMwDlcLiw4q36` y comercio `bbb760d5-a8f3-4700-9a96-f58f11f345ac`. |
| 5 | `1768243841542` | Kim | `business` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Documento de comercio `1768243841542` con 27 ventas registradas. |
| 6 | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | FRITONI | `business` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Cuenta de comercio `fritonic@gmail.com` vinculada a la marca `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2`. |
| 7 | `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | kimberly Flores | `business` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Cuenta de comercio `kim@gmail.com` vinculada a la marca `8O8hJe5kSzNQxUkLwwkCsipGmAI3`. |
| 8 | `1768878763084` | Henry Paz | `SELLER` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Vendedor de comercio con 65 ventas registradas en la colección `sales`. |
| 9 | `1769029559449` | Chepita | `SELLER` | `AFFILIATION` | `MERCHANT_AFFILIATION` | Vendedor de comercio con 8 ventas registradas en la colección `sales`. |
| 10 | `3Wt0XdzeOTfG1OXn72ApIhVbE5i1` | Kimberly Flores Centeno | `customer` | `APP` | `APP` | Registro desde App móvil (`familiaflorescenteno@gmail.com`), dispositivo Android y 1 pedido. |
| 11 | `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | Henry Paz | `courier` | `APP` | `APP` | Perfil de motorizado en App (`hpaz@gmail.com`), teléfono 82397401 y dispositivo móvil. |
| 12 | `dbX1tvV2WNdFv4KWMbWNW8lngDI2` | Gerald Jose Flores Gutierrez | `customer` | `APP` | `APP` | Registro de cliente App con dispositivo Android registrado en `/user_devices`. |
| 13 | `h00PIZpMgxSaqSVnYpRLPq0DYGC3` | ITED Virtual | `customer` | `APP` | `APP` | Registro de cliente App (`itedvirtual@gmail.com`) con 1 pedido realizado. |

---

### 2.2 Población No Operacional Excluida (31 Identidades)

#### A) Usuarios de Prueba (`TEST`) — 3 Registros
- `test_auth_fs_1786904851220` (Test Both — Perfil sintético de pruebas de integración).
- `test_biz_1786904636301` (Comercio Prueba E2E Automation).
- `test_biz_1786904659755` (Comercio Prueba E2E Automation).

#### B) Registros POS Legacy Preexistentes (`LEGACY_PREEXISTING`) — 28 Registros
- `1768226535785` (Gerald José Flores Gutiérrez — Cliente de caja sin correo ni dispositivo).
- `USR-1768621181014` (Zamir Ocornor)
- `USR-1769025804680` (Omar Altamirano)
- `USR-1769029685895` (Richard centeno)
- `USR-1769098535884` (Adolfo Urbina)
- `USR-1769190932815` (vicenta gutirrrez)
- `USR-1769194803657` (adolfo urbina)
- `USR-1769465117595` (andy flores)
- `USR-1769487243198` (Helo Jdkdk)
- `USR-1769620170492` (pepe flores)
- `USR-1769633352410` (Gggg Ghh)
- `USR-1769711990359` (venus flores)
- `USR-1770060240159` (Jairo AldNa)
- `USR-1771428610412` (Nelson Busto)
- `USR-1772377026947` (Luciana Aldana)
- `USR-CL-1768337682525` (allan mendoza)
- `USR-CL-1768342901776` (zoe flores)
- `USR-CL-1768365031013` (maria chavez)
- `USR-CL-1768422839897` (denis flores)
- `user_cli_1768237897386` (Aldrich Flores)
- `user_cli_1768240170991` (venus flores)
- `user_cliente0002_2026` (Perla Centeno)
- `user_cliente0008_2026` (Junior Flores)
- `user_cliente0009_2026` (hola oooo)
- `user_cliente0010_2026` (maria ramos)
- `user_cliente0011_2026` (sonia matamoros)
- `user_cliente1768275049139` (eva morales)
- `user_cliente1768278375844` (xoci ruiz)

---

## 3. Alineación 100% entre Usuarios & Roles y Governance Center

Se verifica que el servicio canónico resolver `identityCanonicalService` expone la misma población operacional a través del método `subscribeToOperationalIdentities()`.

```
                  /users (44 Docs Físicos)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
     OPERACIONALES (13)        NO OPERACIONALES (31)
     (APP / ADMIN / AFFIL)     (TEST / LEGACY_PREEXISTING)
               │
      ┌────────┴────────┐
      ▼                 ▼
Usuarios & Roles    Governance Center
 (13 Identidades)    (13 Identidades)
      │                 │
      └──────┬──────────┘
             ▼
      MISMO UID SET (100% Coincidencia)
      Admin Only = 0 | Governance Only = 0
```
