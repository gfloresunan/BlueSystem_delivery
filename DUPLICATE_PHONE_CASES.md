# FASE H — EXPEDIENTE FORENSE DE TELÉFONOS DUPLICADOS

**Teléfono Investigado:** `82397401` / `+50582397401`  
**Total Cuentas Asociadas:** 5  
**Estatus:** `POTENTIAL_DUPLICATE` — **NO ACTION TAKEN (Modo Solo Lectura)**  

---

## 1. Inventario de Cuentas Compartiendo el Número `82397401`

| UID / Document ID | Nombre | Email | Rol | identityType | Auth | Dispositivos | Actividad Operativa | Riesgo | Acción Recomendada |
| :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| `8O8hJe5kSzNQxUkLwwkCsipGmAI3` | kimberly Flores | kim@gmail.com | `business` | `BUSINESS` | NO | 0 | NO | HIGH (45) | `KEEP` |
| `9QHYGkSa3nWiJ7KfPkccjjuIaYp2` | Henry Paz | hpaz@gmail.com | `courier` | `COURIER` | NO | 1 | NO | HIGH (55) | `KEEP` |
| `XWNzPT5p6fbf7reFdFBNTZoQrY42` | Junior Flores | gflores@unan.edu.ni | `business` | `BUSINESS` | NO | 0 | SÍ | MEDIUM (20) | `KEEP` |
| `dlRY2ZVUqPR2Fxoc3cazcOxxRJg2` | FRITONI | fritonic@gmail.com | `business` | `BUSINESS` | NO | 2 | NO | HIGH (45) | `KEEP` |
| `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` | Aldrich Flores | ventas@tecnocomp.com.ni | `business` | `BUSINESS` | NO | 0 | SÍ | MEDIUM (20) | `KEEP` |


---

## 2. Análisis Forense de Causa Raíz

1. **Cuentas Anónimas / Móvil:** 4 UIDs independientes (`8O8hJe5k...`, `9QHYGkSa...`, `XWNzPT5p...`, `dlRY2ZVU...`) fueron creados en Firestore con el esquema legacy `userType: customer` registrando únicamente el número telefónico sin correo ni nombre.
2. **Origen probable:** Inicios de sesión repetidos vía OTP por SMS en diferentes sesiones o reinstalaciones de la App Cliente sin vinculación previa del token de autenticación.
3. **Cuenta Business Adicional:** La cuenta EIAM Merchant Owner `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2` (Aldrich Flores) posee este mismo número en formato E.164 (`+50582397401`).

---

## 3. Protocolo de Saneamiento Recomendado (Para FASE I Futura)

> [!WARNING]
> **NO FUSIONAR NI ELIMINAR EN ESTA FASE.**
> Cualquier acción en la FASE I deberá cumplir las siguientes precondiciones:
> 1. Verificación manual por SMS/WhatsApp confirmando si las 4 cuentas anónimas pertenecen al mismo propietario.
> 2. Verificar que ninguna de las 4 cuentas anónimas tenga pedidos en tránsito ni saldos pendientes de pago.
> 3. En caso de requerir unificación, vincular los registros históricos al perfil canónico y archivar los UIDs redundantes.
