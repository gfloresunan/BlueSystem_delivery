# FASE F — ANÁLISIS FORENSE DE IDENTIDADES DUPLICADAS

**Proyecto:** BlueSystem Delivery (`bluesystem-7c9af`)  
**Fecha:** 16 de Agosto, 2026  
**Fase:** F — Auditoría Forense de Identidades y Usuarios (Modo Solo Lectura)  

---

## 1. Resumen Ejecutivo del Análisis de Duplicados

Se ejecutó un análisis exhaustivo de unicidad sobre los 41 documentos de la colección `/users` en Firestore. Se evaluaron las siguientes propiedades clave:
* Correos Electrónicos (`email`, `mail`, `correo`)
* Números Telefónicos (`telefono`, `phone`, `phoneNumber`)
* Nombres de Usuario (`nombre`, `name`, `displayName`)
* Identificadores de Usuario (`uid`, `documentId`)

---

## 2. Hallazgos de Duplicidad por Teléfono

### Teléfono: `82397401` / `+50582397401`
Se identificó **1 grupo de duplicidad crítica por número telefónico** que abarca 4 documentos independientes en la colección `/users`:

| Document ID / UID | Nombre Registrado | Email Registrado | Rol / userType | Estado | Fecha Registro / Schema | Clasificación |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | `*(sin nombre)*` | `*(sin email)*` | `customer` | ACTIVO | Schema Legacy (`userType: customer`) | `POTENTIAL_DUPLICATE` |
| `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | `*(sin nombre)*` | `*(sin email)*` | `customer` | ACTIVO | Schema Legacy (`userType: customer`) | `POTENTIAL_DUPLICATE` |
| `XWNzPT5p6fbf7reFdFBNTZoQrY42` | `*(sin nombre)*` | `*(sin email)*` | `customer` | ACTIVO | Schema Legacy (`userType: customer`) | `POTENTIAL_DUPLICATE` |
| `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | `*(sin nombre)*` | `*(sin email)*` | `customer` | ACTIVO | Schema Legacy (`userType: customer`) | `POTENTIAL_DUPLICATE` |

**Causa Raíz:** Creaciones sucesivas de perfiles anónimos o por OTP SMS durante pruebas/autenticaciones repetidas utilizando el mismo número de teléfono sin resincronización de credenciales.

**Estado:** `POTENTIAL_DUPLICATE` — **NO ACTION TAKEN (Modo Solo Lectura)**

---

## 3. Hallazgos de Coincidencia por Nombre de Usuario

### Nombre: "Aldrich Flores"
Se identificaron 2 cuentas que representan a la misma persona física en distintos niveles del sistema:

1. **`qtlV8m8wj0ed0tQFXKzjfXKzQ5g2`**
   * **Nombre:** `Aldrich Flores` (`nombre` y `name`)
   * **Email:** `ventas@tecnocomp.com.ni`
   * **Rol:** `business` (EIAM: `MERCHANT_OWNER`)
   * **Teléfono:** `+50582397401`
   * **Visualización:** Visible en **Governance Center** y en **Panel Admin Web**.

2. **`user_cli_1768237897386`**
   * **Nombre:** `Aldrich  Flores` (`name` únicamente, falta propiedad `nombre`)
   * **Email:** `*(sin email)*` (`username: aflores26`, `relatedClientId: cliente0003_2026`)
   * **Rol:** `CLIENT`
   * **Origen:** Sincronización del punto de venta escritorio (POS).
   * **Visualización:** Visible únicamente en **Governance Center**.

**Estado:** `ACCOUNT_SPLIT_BY_SYSTEM` — **NO ACTION TAKEN (Modo Solo Lectura)**

---

## 4. Hallazgos por Correo Electrónico

* **Emails duplicados encontrados:** **0**
* Todos los correos electrónicos presentes en la colección `/users` son únicos.

---

## 5. Tabla Resumen de Estado de Seguridad

```text
STATUS STATEMENT:
- Firestore Writes Performed: 0
- Firestore Deletes Performed: 0
- Firebase Auth Mutations: 0
- Duplicates Merged: 0
- Status: READ-ONLY AUDIT COMPLETE (NO ACTION TAKEN)
```
