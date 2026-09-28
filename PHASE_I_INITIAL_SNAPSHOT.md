# FASE I — SNAPSHOT LÓGICO INICIAL DE IDENTIDADES Y DE DOMINIOS

**Proyecto:** BlueSystem Enterprise v2.2 / Delivery Platform (`bluesystem-7c9af`)  
**Fecha:** 16 de Agosto de 2026  
**Modo:** SOLO LECTURA (Zero Data Mutations)  

---

## 1. Resumen Cuantitativo de Colecciones Ingestadas

* **`users`:** 41 documentos
* **`user_devices`:** 16 documentos
* **`devices`:** 0 documentos
* **`businesses`:** 9 documentos
* **`branches`:** 6 documentos
* **`organizations`:** 2 documentos
* **`membership`:** 2 documentos
* **`merchant_applications`:** 4 documentos
* **`sales`:** 356 documentos
* **`payments`:** 211 documentos
* **`orders`:** 3 documentos
* **`audit_events`:** 9 documentos
* **`notifications`:** 11 documentos

---

## 2. Reconciliación de Estado Firebase Authentication

```text
AUTH_ENUMERATION_STATUS: BLOCKED
API Required: identitytoolkit.googleapis.com
Permission Required: serviceusage.services.use
Reason: ADC Local application is authenticating using Default Credentials without a quota project set.
Action Taken: No mock status invented. Authentication evidence documented via Firestore records and login events.
```

---

## 3. Tabla Snapshot de las 41 Identidades en `/users`

| # | UID | Nombre Efectivo | Raw Name | Email | Teléfono | Rol Canónico | Tipo Identidad | Auth Status | Dispositivos | Actividad Operativa | Acción Recomendada |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: | :--- |
| 1 | `1768226535785` | Gerald José  Flores Gutiérrez | Gerald José  Flores Gutiérrez | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 2 | `1768243841542` | Kim | Kim | Sin correo | N/A | `business` | `BUSINESS` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `REMEDIATE` |
| 3 | `1768878763084` | Henry Paz | Henry Paz | Sin correo | N/A | `seller` | `SELLER` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `REMEDIATE` |
| 4 | `1769029559449` | Chepita | Chepita | Sin correo | N/A | `seller` | `SELLER` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `REMEDIATE` |
| 5 | `3Wt0XdzeOTfG1OXn72ApIhVbE5i1` | Kimberly Flores Centeno | Kimberly Flores Centeno | familiaflorescenteno@gmail.com | N/A | `undefined` | `UNKNOWN` | `AUTH_ENUMERATION_BLOCKED` | 2 | SÍ | `KEEP` |
| 6 | `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | kimberly Flores | kimberly Flores | kim@gmail.com | 82397401 | `business` | `BUSINESS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `LINK` |
| 7 | `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | Henry Paz | Henry Paz | hpaz@gmail.com | 82397401 | `courier` | `COURIER` | `AUTH_ENUMERATION_BLOCKED` | 1 | NO | `LINK` |
| 8 | `USR-1768621181014` | Zamir Ocornor | Zamir Ocornor | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 9 | `USR-1769025804680` | Omar Altamirano | Omar Altamirano | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 10 | `USR-1769029685895` | Richard centeno | Richard centeno | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 11 | `USR-1769098535884` | Adolfo Urbina | Adolfo Urbina | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 12 | `USR-1769190932815` | vicenta gutirrrez | vicenta gutirrrez | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 13 | `USR-1769194803657` | adolfo  urbina | adolfo  urbina | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 14 | `USR-1769465117595` | andy flores | andy flores | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 15 | `USR-1769487243198` | Helo Jdkdk | Helo Jdkdk | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 16 | `USR-1769620170492` | pepe flores | pepe flores | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 17 | `USR-1769633352410` | Gggg Ghh | Gggg Ghh | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 18 | `USR-1769711990359` | venus flores | venus flores | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 19 | `USR-1770060240159` | Jairo  AldNa | Jairo  AldNa | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 20 | `USR-1771428610412` | Nelson Busto | Nelson Busto | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 21 | `USR-1772377026947` | Luciana  Aldana | Luciana  Aldana | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 22 | `USR-CL-1768337682525` | allan mendoza | allan mendoza | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 23 | `USR-CL-1768342901776` | zoe flores | zoe flores | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 24 | `USR-CL-1768365031013` | maria chavez | maria chavez | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 25 | `USR-CL-1768422839897` | denis flores | denis flores | Sin correo | N/A | `customer` | `GUEST` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REMEDIATE` |
| 26 | `XWNzPT5p6fbf7reFdFBNTZoQrY42` | Junior Flores | Junior Flores | gflores@unan.edu.ni | 82397401 | `business` | `BUSINESS` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `LINK` |
| 27 | `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` | Gerald Flores | Gerald Flores | geraldflores07@gmail.com | N/A | `admin` | `ADMIN` | `AUTH_ENUMERATION_BLOCKED` | 1 | SÍ | `KEEP` |
| 28 | `admin_initial` | Admin Gerald Flores | Admin Gerald Flores | admin@blue.com | N/A | `admin` | `ADMIN` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `REMEDIATE` |
| 29 | `dbX1tvV2WNdFv4KWMbWNW8lngDI2` | Gerald Jose Flores Gutierrez | Gerald Jose Flores Gutierrez | Sin correo | N/A | `undefined` | `UNKNOWN` | `AUTH_ENUMERATION_BLOCKED` | 1 | NO | `KEEP` |
| 30 | `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | FRITONI | FRITONI | fritonic@gmail.com | 82397401 | `business` | `BUSINESS` | `AUTH_ENUMERATION_BLOCKED` | 2 | NO | `LINK` |
| 31 | `h00PIZpMgxSaqSVnYpRLPq0DYGC3` | ITED Virtual | ITED Virtual | itedvirtual@gmail.com | N/A | `undefined` | `UNKNOWN` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `KEEP` |
| 32 | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | Aldrich Flores | ventas@tecnocomp.com.ni | +50582397401 | `business` | `BUSINESS` | `AUTH_ENUMERATION_BLOCKED` | 0 | SÍ | `LINK` |
| 33 | `user_cli_1768237897386` | Aldrich  Flores | Aldrich  Flores | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 34 | `user_cli_1768240170991` | venus flores | venus flores | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 35 | `user_cliente0002_2026` | Perla  Centeno | Perla  Centeno | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 36 | `user_cliente0008_2026` | Junior Flores | Junior Flores | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 37 | `user_cliente0009_2026` | hola oooo | hola oooo | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 38 | `user_cliente0010_2026` | maria ramos | maria ramos | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 39 | `user_cliente0011_2026` | sonia matamoros | sonia matamoros | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 40 | `user_cliente1768275049139` | eva morales | eva morales | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
| 41 | `user_cliente1768278375844` | xoci ruiz | xoci ruiz | Sin correo | N/A | `customer` | `LEGACY_POS` | `AUTH_ENUMERATION_BLOCKED` | 0 | NO | `REVIEW` |
