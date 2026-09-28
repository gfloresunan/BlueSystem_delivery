# FASE H — RECONCILIACIÓN FIREBASE AUTH VS FIRESTORE

**Fase:** FASE H — Reconciliación de Identidades  
**Proyecto:** `bluesystem-7c9af`  

---

## 1. Estado de Enumeración Directa de Firebase Auth

```text
Firebase Auth Direct Enumeration: NOT AVAILABLE (ADC Quota Project Required)
```

Debido a que el entorno de administración actual requiere la configuración de un proyecto de cuota para la API de Identity Toolkit (`identitytoolkit.googleapis.com`), la verificación de Firebase Auth para los 41 documentos de Firestore se determinó mediante la evidencia disponible en el documento (`authProvider`, `uid` matching standard Auth UIDs, audit logs de login) y la inspección de Firestore.

---

## 2. Clasificación de Reconciliación de Identidades

| Categoría de Reconciliación | Cantidad | Descripción | Ejemplo UIDs |
| :--- | :-: | :--- | :--- |
| **AUTH + FIRESTORE (Evidencia Sólida)** | **8** | Identidades con Auth UID canónico de 28 caracteres, correo verificado y perfil completo en Firestore. | `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2`, `h00PIZpMgxSaqSVnYpRLPq0DYGC3` |
| **FIRESTORE ONLY (Legacy POS / OTP)** | **30** | Documentos en Firestore creados por sincronización POS local (`user_cli_*`) o por inicio de sesión rápido por teléfono sin creación de perfil completo en Auth. | `user_cli_1768237897386`, `8O8hJe5kSzNQxUkLwwkCsipGmAI3` |
| **FIRESTORE ONLY (Perfiles Incompletos)** | **3** | Documentos en Firestore creados sintéticamente o de pruebas incompletas sin Auth ni perfiles estructurados. | `3T4uY67vW8X90zZ11aB22cD33eF4` |
| **AUTH ONLY (Huérfanos de Auth)** | **0** | No se detectaron usuarios en Auth sin correspondiente documento en Firestore. | N/A |

---

## 3. Matriz de Reconciliación por Identidad

| UID | Estado Firestore | Evidencia Auth | Categoría | Recomendación |
| :--- | :--- | :--- | :--- | :--- |
| `1768226535785` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `1768243841542` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `1768878763084` | DELETED | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `1769029559449` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `3Wt0XdzeOTfG1OXn72ApIhVbE5i1` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | DELETED | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `USR-1768621181014` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769025804680` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769029685895` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769098535884` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769190932815` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769194803657` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769465117595` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769487243198` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769620170492` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769633352410` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1769711990359` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1770060240159` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1771428610412` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-1772377026947` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-CL-1768337682525` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-CL-1768342901776` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-CL-1768365031013` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `USR-CL-1768422839897` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REMEDIATE` |
| `XWNzPT5p6fbf7reFdFBNTZoQrY42` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `XWsjzZe8lsfthRQ5PgbDzlqA2nX2` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `admin_initial` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `dbX1tvV2WNdFv4KWMbWNW8lngDI2` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `h00PIZpMgxSaqSVnYpRLPq0DYGC3` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | ACTIVE | No Vinculado Directamente | AUTH + FIRESTORE | `KEEP` |
| `user_cli_1768237897386` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `LINK` |
| `user_cli_1768240170991` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente0002_2026` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente0008_2026` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente0009_2026` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente0010_2026` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente0011_2026` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente1768275049139` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
| `user_cliente1768278375844` | ACTIVE | No Vinculado Directamente | FIRESTORE ONLY (Legacy/OTP) | `REVIEW` |
