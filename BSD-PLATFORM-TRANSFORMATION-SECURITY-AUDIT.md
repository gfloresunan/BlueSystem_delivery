# BSD — SECURITY & RULES AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. AUDITORÍA DE `firestore.rules`

### A. Diagnóstico de Helpers de Seguridad
```javascript
function getTenantId() {
  return request.auth.token.get("tenantId", null);
}

function getBrandId() {
  return request.auth.token.get("brandId", null);
}

function isTenantMember(resourceTenantId) {
  return isPlatformAdmin() || (getTenantId() != null && resourceTenantId != null && getTenantId() == resourceTenantId);
}
```
- **Evaluación:** Los helpers garantizan que un token JWT con `tenantId = "ten-live-commercial-01"` sea automáticamente bloqueado si intenta leer o escribir en un documento cuyo `tenantId = "ten-live-commercial-02"`.

### B. Matriz de Vectores de Seguridad

| Vector de Ataque Potencial | Regla de Mitigación en `firestore.rules` | Estado |
|---|---|---|
| **Escritura Cruzada entre Tenants** | `isTenantMember(resource.data.tenantId)` | 🔒 Bloqueado |
| **Escritura Cruzada entre Comercios** | `ownsBusiness(businessId)` / `isWritingOwnBusinessId()` | 🔒 Bloqueado |
| **Escalación de Privilegios de Rol** | Regla `/users/{uid}` bloquea campos `["role", "userType", "rol", "eiamRole", "isActive"]` | 🔒 Bloqueado |
| **Falsificación de Balances Financieros** | `/financial_events`, `/courier_cash_ledger` tienen `allow write: if false;` | 🔒 Bloqueado |
| **Peticiones sin App Check** | `isAppCheckVerified()` evalúa Play Integrity y reCAPTCHA | 🔒 Bloqueado |
| **Inyección de Claims desde Cliente** | Custom Claims solo pueden emitirse vía Firebase Admin SDK | 🔒 Bloqueado |

---

## 2. GOBERNANZA DE DESPLIEGUE (ADR-014 NO AUTO-ROLLOUT)
- **Política Inmutable:** Ningún resultado de auditoría, test o script automatizado puede modificar los parámetros de canary, emitir claims masivos o aprovisionar nuevos tenants sin una **orden humana explícita, separada e inequívoca**.
- **Estado de Cumplimiento:** 🟢 **100% CONFORME**.
