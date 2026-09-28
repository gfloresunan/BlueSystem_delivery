# C2D25E.4 — MULTI-PLATFORM IMPLEMENTATION PLAN
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Fases Secuenciales de Evolución

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-PLATFORM ROADMAP SPECIFICATION                     │
├───────────────────┬───────────────────────────────┬─────────────────────────┤
│ Horizonte         │ Fase / Iniciativa             │ Alcance y Acciones      │
├───────────────────┼───────────────────────────────┼─────────────────────────┤
│ NOW (Completado)  │ C2D.25E.4                     │ Auditoría Forense Core  │
│ NEXT              │ C2D.25E.5 (Flutter Foundation)│ Creación base Flutter   │
│ FUTURE            │ C2D.25E.6 (Flutter Android)   │ Cliente Flutter Android │
│ FUTURE            │ C2D.25E.7 (Flutter iOS)       │ Cliente Flutter iOS     │
│ FUTURE            │ C2D.25E.8 (Multi-Build Engine)│ Orquestador Multi-Build │
└───────────────────┴───────────────────────────────┴─────────────────────────┘
```

---

### 2. Detalle de Fases Futuras

#### Fase 1: NOW — Auditoría y Evaluación (C2D.25E.4)
- **Acción:** Auditoría forense exhaustiva de desacoplamiento del Core y compatibilidad Flutter. Cero código implementado, cero migraciones.

#### Fase 2: NEXT — Flutter Foundation (C2D.25E.5)
- **Acción:** Creación de la estructura base del proyecto Flutter (`apps/flutter_client/` o repositorio satélite), configuración de paquetes oficiales de Firebase (`firebase_core`, `firebase_auth`, `cloud_firestore`, `cloud_functions`, `firebase_messaging`), e implementación del cliente de Gatekeeper y Brand Hydration en Dart.

#### Fase 3: FUTURE — Flutter Android Client (C2D.25E.6)
- **Acción:** Implementación del flujo de órdenes, mapa y perfil de usuario en Flutter para Android.

#### Fase 4: FUTURE — Flutter iOS Client (C2D.25E.7)
- **Acción:** Configuración de credenciales de Apple Developer, certificados de firma, APNs y validación física en dispositivos iOS.

#### Fase 5: FUTURE — Multi-Platform Build Engine (C2D.25E.8)
- **Acción:** Extensión del Build Engine para automatizar la generación de binarios APK, AAB e IPA a partir de `BuildRequestEntity`.
