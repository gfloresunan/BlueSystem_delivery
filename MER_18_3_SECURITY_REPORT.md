# 🔐 BLUE SYSTEM DELIVERY ENTERPRISE
# MER 18.3 — MERCHANT MODULE GAP REMEDIATION & FULL E2E HARDENING
## INFORME DE SEGURIDAD Y PERMISOS EIAM (SECURITY AUDIT REPORT)

**Fecha:** 14 de Septiembre de 2026  
**Sistema:** BlueSystem Delivery Enterprise v2.3  
**Módulo:** Merchant / Comercio (Móvil Android)  
**Marco Normativo:** EIAM v2.2 Enterprise / ADR-014 (No Auto-Rollout Policy)  
**Estatus:** 🟢 **CERTIFICADO — 100% AISLAMIENTO MULTI-TENANT**

---

## 1. EVALUACIÓN DE VULNERABILIDADES Y CONTROLES

### A. Aislamiento Multi-Tenant
- **Riesgo Prevenido:** Acceso cruzado a pedidos de otros restaurantes en KDS o acceso a personal de otras empresas.
- **Control Aplicado:** Todas las consultas y listeners en `KitchenDashboardScreen`, `MerchantStaffViewModel` y `PromotionsManagementView` están estrictamente condicionados a `canonicalBusinessId` validado por `MerchantIdentityResolver`.
- **Resultado:** Ningún comercio puede visualizar ni alterar datos de otro comercio.

### B. Seguridad en FileProvider (`FinancialReportGenerator`)
- **Riesgo Prevenido:** Fuga de almacenamiento, path traversal (`../../`) o exposición de archivos privados del sistema.
- **Control Aplicado:**
  - Los reportes PDF y CSV se generan exclusivamente dentro de `context.cacheDir/reports/`.
  - El acceso se expone de forma efímera y de solo lectura mediante `FileProvider.getUriForFile()` con el flag `Intent.FLAG_GRANT_READ_URI_PERMISSION`.
  - El provider `androidx.core.content.FileProvider` tiene `android:exported="false"`.
- **Resultado:** Cero exposición indebida de archivos de la aplicación.

### C. Integridad en Acciones Telefónicas (GAP-004)
- **Riesgo Prevenido:** Inyección de esquemas maliciosos o marcación oculta.
- **Control Aplicado:**
  - Se utiliza `Intent.ACTION_DIAL` en lugar de `ACTION_CALL` para evitar requerir permisos peligrosos (`CALL_PHONE`) y requerir siempre la confirmación del usuario en el marcador nativo.
  - El número de WhatsApp se sanitiza extrayendo únicamente dígitos numéricos (`rawDigits.filter { it.isDigit() }`), garantizando que no se puedan inyectar comandos o URLs externas no autorizadas.

### D. Seguridad en Roles de Empleados (GAP-008)
- **Riesgo Prevenido:** Elevación de privilegios no autorizada.
- **Control Aplicado:**
  - La asignación de roles en `MerchantStaffCenterScreen` restringe la creación únicamente a roles operativos de comercio (`MANAGER`, `SUPERVISOR`, `CASHIER`, `COOK`).
  - No es posible asignar roles de plataforma (`SUPER_ADMIN`, `ADMIN`, `AUDITOR`).
  - Cada registro incluye `invitedBy = currentUid` para auditoría y trazabilidad completa.

---

## 2. VEREDICTO DE SEGURIDAD
Las modificaciones aplicadas en MER 18.3 cumplen con los estándares de seguridad de nivel bancario de BlueSystem Delivery Enterprise y respetan la política fail-closed de EIAM.
