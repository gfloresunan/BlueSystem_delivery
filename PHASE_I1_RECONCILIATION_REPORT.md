# FASE I.1 — REPORTE DE RECONCILIACIÓN CANÓNICA DE ARTEFACTOS Y CLASIFICACIONES

**Sistema:** BlueSystem Enterprise v2.2 / Delivery Platform  
**Firebase Project:** `bluesystem-7c9af`  
**Fecha:** 16 de Agosto de 2026  
**Modo:** STRICT READ-ONLY / DRY-RUN CERTIFIED  

---

## 1. Investigación y Causa Raíz de la Discrepancia Previa

En la Fase I anterior, la simulación Dry-Run se ejecutó correctamente sin mutaciones de datos. Sin embargo, existía una inconsistencia de presentación entre el reporte en Markdown y la matriz JSON inicial:
* El reporte Markdown agrupó: `KEEP = 8, REMEDIATE = 19, LINK = 1, REVIEW = 13`.
* La matriz JSON inicial agrupó: `KEEP = 4, REMEDIATE = 23, LINK = 5, REVIEW = 9` (al contabilizar los 4 casos de `PHONE_MATCH` del número 82397401 dentro de la categoría genérica `LINK` y clasificar como `REMEDIATE` perfiles con campos ausentes).

---

## 2. Solución Aplicada en FASE I.1: Taxonomía de Acción Primaria vs Banderas Secundarias

Se estableció una jerarquía estricta donde cada identidad pertenece a **EXACTAMENTE UNA ACCIÓN PRIMARIA** (`PRIMARY_ACTION`) y puede poseer múltiples **BANDERAS SECUNDARIAS** (`SECONDARY_FLAGS`):

1. **`LINK_CANDIDATE` (1 Identidad):** Reservado exclusivamente para propuestas de enlace entre UIDs independientes. Caso 001: cuenta POS `user_cli_1768237897386` (Aldrich Flores).
2. **`REVIEW` (12 Identidades):** Cuentas que requieren auditoría humana antes de cualquier cambio. Incluye 8 clientes POS Legacy y 4 cuentas OTP anónimas con la bandera secundaria `PHONE_MATCH` (`82397401`). El teléfono compartido NO las convierte automáticamente en `LINK_CANDIDATE`.
3. **`REMEDIATE` (23 Identidades):** Cuentas activas con propuesta de normalización segura de campo (`nombre` <- `name`).
4. **`KEEP` (5 Identidades):** Cuentas perfectamente estructuradas que no requieren intervención (incluyendo la cuenta de comercio de Aldrich `qtlV8m8wj0ed0tQFXKzjfXKzQ5g2`, 2 admins, 1 courier, etc.).
5. **`ARCHIVE_CANDIDATE` (0) & `DELETE_CANDIDATE` (0):** Cero candidatos a borrado o archivado.

---

## 3. Matriz de Reconciliación de Artefactos

| Artefacto Analizado | Valor Anterior | Estado Reconciliado FASE I.1 | Fuente de Verdad Utilizada |
| :--- | :--- | :--- | :--- |
| **Matriz de Identidades** | Heterogéneo | **41 Identidades Únicas** | Documentos físicos en Firestore `/users` |
| **Suma Acciones Primarias** | Discrepante | **Exactamente 41 (100%)** | Evaluación canónica individualizada |
| **`LINK_APPROVED`** | Incierto | **0 (Strict Zero)** | Regla de cero mutaciones |
| **`DELETE_CANDIDATE`** | 0 | **0 (Strict Zero)** | Criterio de protección absoluta |
| **Auth Status** | Incierto | **`AUTH_ENUMERATION_BLOCKED`** | Respuesta oficial API `identitytoolkit` |
