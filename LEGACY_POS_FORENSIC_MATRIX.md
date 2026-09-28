# FASE H — MATRIZ FORENSE DE IDENTIDADES LEGACY / POS (9 REGISTROS)

**Fase:** FASE H — Auditoría Forense de Identidades  
**Subconjunto:** Registros sincronizados por el Punto de Venta Escritorio (POS) y esquemas de cliente legacy (`user_cli_*`, `user_cliente*`)  

---

## 1. Tabla Inventario de Identidades Legacy POS

| # | Document ID / UID | Nombre (Efectivo) | Username POS | Cliente Relacionado ID | Email | Auth | Dispositivos | Actividad | Riesgo | Acción Recomendada |
| :-: | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | `user_cli_1768237897386` | Aldrich  Flores | `Aldrich  Flores` | `cli_1768237897386` | Sin correo | NO | 0 | NO | HIGH | `LINK` |
| 2 | `user_cli_1768240170991` | venus flores | `venus flores` | `cli_1768240170991` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 3 | `user_cliente0002_2026` | Perla  Centeno | `Perla  Centeno` | `cliente0002_2026` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 4 | `user_cliente0008_2026` | Junior Flores | `Junior Flores` | `cliente0008_2026` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 5 | `user_cliente0009_2026` | hola oooo | `hola oooo` | `cliente0009_2026` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 6 | `user_cliente0010_2026` | maria ramos | `maria ramos` | `cliente0010_2026` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 7 | `user_cliente0011_2026` | sonia matamoros | `sonia matamoros` | `cliente0011_2026` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 8 | `user_cliente1768275049139` | eva morales | `eva morales` | `cliente1768275049139` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |
| 9 | `user_cliente1768278375844` | xoci ruiz | `xoci ruiz` | `cliente1768278375844` | Sin correo | NO | 0 | NO | HIGH | `REVIEW` |


---

## 2. Análisis del Esquema POS Legacy

* **Propiedad de Nombre:** Usan `name` en lugar de `nombre`.
* **Credenciales Locales:** Almacenan `username` y `password` para autenticación local en la aplicación de escritorio POS (caja registradora local).
* **Vinculación con Clientes POS:** Poseen el campo `relatedClientId` apuntando a la tabla de clientes del catálogo comercial local.
* **Diagnóstico:** Ninguno de los 9 registros contiene el campo `nombre`, motivo por el cual el Panel Admin Web los ocultaba antes de la FASE G. No son basura; representan cuentas de clientes creadas desde la caja de cobro del comercio.

---

## 3. Recomendaciones de Gobernanza

* **NO ELIMINAR:** 9/9 registros deben conservarse para mantener la trazabilidad de las ventas locales en el POS.
* **VINCULACIÓN FUTURA (FASE I):** En caso de que un cliente cree una cuenta en la App Móvil con el mismo teléfono o nombre, se debe realizar un *Account Link* en lectura/asociación sin borrar la cuenta POS original.
