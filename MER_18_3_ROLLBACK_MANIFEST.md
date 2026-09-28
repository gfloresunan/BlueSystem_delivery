# 🔐 BLUE SYSTEM DELIVERY ENTERPRISE
# MER 18.3 — MERCHANT MODULE GAP REMEDIATION & FULL E2E HARDENING
## MANIFIESTO DE ROLLBACK Y CONTINGENCIA (ROLLBACK MANIFEST)

**Fecha:** 14 de Septiembre de 2026  
**Sistema:** BlueSystem Delivery Enterprise v2.3  
**Módulo:** Merchant / Comercio (Móvil Android)  
**Objetivo:** Procedimiento determinístico de reversión en caso de contingencia operativa  

---

## 1. POLÍTICA DE ROLLBACK

Dado que cada uno de los 10 cambios fue implementado de forma **atómica y aislada**, cualquier remediación puede ser revertida independientemente sin provocar cascadas de fallos en los demás módulos ni requerir migraciones destructivas de base de datos.

---

## 2. INVENTARIO DE REVERSIÓN POR GAP

### GAP-006 (Extras en Pedidos):
- **Archivo:** `app/src/main/java/com/example/presentation/customer/profile/OrderHistoryModels.kt`
- **Reversión:** Remover `val selectedOptions: List<SelectedOption> = emptyList()` o mantener el default vacío.
- **Impacto:** Ninguno. Los pedidos anteriores no contenían dicho array.

### GAP-009 (Flujo Carrito):
- **Archivo:** `app/src/main/java/com/example/ComercioDetalleScreen.kt`
- **Reversión:** Reemplazar `showCheckoutDialog = true` por `navController.popBackStack()`.
- **Impacto:** Vuelve al comportamiento anterior de cierre de vista.

### GAP-010 (Apertura / Cierre):
- **Archivo:** `app/src/main/java/com/example/presentation/business/dashboard/MerchantDashboardViewModel.kt`
- **Reversión:** Retornar a la actualización simple de una sola colección.
- **Impacto:** Reintroduce el split-brain, pero no corrompe datos históricos.

### GAP-005 (Combos en Detalle):
- **Archivo:** `app/src/main/java/com/example/ComercioDetalleScreen.kt`
- **Reversión:** Remover la pestaña "COMBOS" de la lista de categorías.
- **Impacto:** Oculta los combos en la vista del cliente.

### GAP-003 (Workspace Productos):
- **Archivo:** `app/src/main/java/com/example/presentation/business/commerce/ProductWorkspaceScreen.kt`
- **Reversión:** Restaurar el botón ficticio.
- **Impacto:** Vuelve a simular la publicación con delay.

### GAP-001 & GAP-002 & GAP-008 (Navegación Drawer, KDS y Staff):
- **Archivo:** `app/src/main/java/com/example/presentation/business/BusinessDashboardScreen.kt`
- **Reversión:** Remover las entradas `PROMOTIONS`, `KDS` y `STAFF` de `BusinessTab` y del Drawer.
- **Impacto:** Oculta los accesos directos de las pantallas sin afectarlas.

### GAP-004 (Llamadas / WhatsApp):
- **Archivo:** `app/src/main/java/com/example/presentation/business/orders/MerchantOperationsCenterScreen.kt`
- **Reversión:** Reemplazar las llamadas a `startActivity` por lambdas vacías `{}`.
- **Impacto:** Los botones vuelven a ser no-operativos.

### GAP-007 (Reportes PDF/CSV):
- **Archivo:** `app/src/main/java/com/example/presentation/business/finance/MerchantFinanceCenterScreen.kt`
- **Reversión:** Remover el botón "Exportar" del TopBar.
- **Impacto:** Oculta la opción de descarga y compartir.

---

## 3. PROCEDIMIENTO GIT UNIFICADO DE ROLLBACK COMPLETO
Si se requiriese revertir el conjunto completo de cambios de la fase MER 18.3:
```bash
git checkout HEAD~1 -- app/src/main/java/
./gradlew :app:compileCoreDebugKotlin
```
---

## 4. ESTADO DE CONTINGENCIA
- **Nivel de Riesgo Operativo:** 🟢 **MÍNIMO (Low Risk)**
- **Procedimiento Validado:** Sí
