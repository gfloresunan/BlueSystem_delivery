# C2D.25E.5 — DECISION PACKAGE
## Protocol ID: `BSD-C2D25E5-FLUTTER-FOUNDATION-MULTIPLATFORM-ARCHITECTURE-001`

---

### 1. Decisiones Arquitectónicas Sometidas a Aprobación Humana

1. **Adopción del Modelo "One Flutter Codebase":**
   - Se ratifica la estructura `flutter_client/` como la base común para futuras aplicaciones comerciales en Android e iOS, manteniendo el cliente Android actual en `app/` como Reference Client en Track A.
2. **Cero Duplicación de Lógica de Negocio:**
   - Toda la lógica comercial autoritativa (asignación de pedidos, cálculo de tarifas, validación de cuotas y cierres de caja) permanece en Cloud Functions y Firestore.
3. **Mantenimiento del Bloqueo de Build (Fail-Closed):**
   - No se emitirán builds ni se crearán APK/IPA hasta que exista una orden humana explícita y se complete el aprovisionamiento de certificados en Firebase/Apple Developer Portal.

---

### 2. Recomendación de Gobernanza

```text
══════════════════════════════════════════════════════════════
RECOMMENDED ACTION:
🟢 ACCEPT C2D.25E.5 FOUNDATION CERTIFICATION
🔒 KEEP BUILD AUTHORIZATION LOCKED UNTIL PROVISIONING PHASE
══════════════════════════════════════════════════════════════
```
