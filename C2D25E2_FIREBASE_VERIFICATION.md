# C2D25E.2 — FIREBASE PROVISIONING VERIFICATION
## Protocol ID: `BSD-C2D25E2-MULTI-BRAND-PROVISIONING-HARDENING-CLOSURE-001`

---

### 1. Estado de `app/google-services.json`

- **Project ID:** `bluesystem-7c9af` (Válido).
- **Clientes Actuales:** `1` (`com.aistudio.delivery.djweq`).
- **Segundo Cliente Android:** ❌ No registrado aún en el archivo.
- **Impacto si se compila un nuevo package:** Fallo crítico de inicialización en `FirebaseAuth`, `FirebaseMessaging` y `AppCheck` durante el arranque de la app.

---

### 2. Checklist para el Operador Humano

1. Acceder a [Firebase Console](https://console.firebase.google.com/) -> Proyecto `bluesystem-7c9af`.
2. Registrar la nueva app Android con el package name del segundo producto (ej. `com.fitoni.delivery`).
3. Registrar SHA-1 de debug: `E0:8F:F8:8A:A2:DE:0C:41:EB:82:81:FB:AD:6B:59:C9:4D:8C:FD:1F`.
4. Descargar el archivo consolidado `google-services.json` y reemplazar `app/google-services.json`.

---

### 3. Veredicto GAP-FB-01
🔴 **OPEN / BLOCKED (EXTERNAL ACTION REQUIRED).**
