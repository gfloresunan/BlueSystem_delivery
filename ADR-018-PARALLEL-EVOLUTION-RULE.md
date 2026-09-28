# ADR-018: BLUE SYSTEM PARALLEL EVOLUTION & DUAL-TRACK ARCHITECTURE RULE
## Regla Arquitectónica Permanente de Evolución Paralela y Plataforma Multicomercial

**Status:** `PERMANENT ARCHITECTURAL BASELINE (INVIOLABLE)`  
**Scope:** `Global System Architecture / Dual-Track Strategy`  
**Supersedes/Extends:** Extends ADR-013, ADR-014, ADR-015, ADR-016, ADR-017  
**Date:** `Agosto 2026`  

---

## 1. Contexto y Visión Estratégica

BlueSystem Delivery ha completado su transición conceptual y arquitectónica:
- **Antes:** Una aplicación de delivery monolítica para un solo modelo operativo.
- **Ahora y en el Futuro:** **BlueSystem Commercial Platform**, un **Único Core de Software** de alta ingeniería capaz de originar, gobernar y operar múltiples soluciones comerciales:

```
                    BLUE SYSTEM CORE
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
   FUNCIONES           CONFIGURACIÓN      COMERCIAL
       │                  │                  │
       ▼                  ▼                  ▼
 Android/Web          Tenant/Brand       Marketplace
 Orders               Subscription       Agency
 Catalog               Features           White Label
 Fleet                 AppConfig          Enterprise
 AI                    Permissions
 Email                 Branding
```

---

## 2. Los Dos Tracks Paralelos de Ingeniería

A partir de esta resolución, el desarrollo y mantenimiento de la plataforma se rige formalmente bajo **dos líneas paralelas no excluyentes**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BLUE SYSTEM CORE                                 │
├────────────────────────────────────┬────────────────────────────────────┤
│                                    │                                    │
│   TRACK A: CORE PRODUCT EVOLUTION  │   TRACK B: COMMERCIAL TRANSFORMATION│
│   🟢 CONTINUO                      │   🟢 STAGED & GOVERNED             │
│                                    │                                    │
│   ├─ Android App                   │   ├─ Multi-Tenant Isolation        │
│   ├─ Merchant Web & Admin Web      │   ├─ Brand Manager (🎨)            │
│   ├─ Orders Engine                 │   ├─ Subscriptions & Plans (💳)    │
│   ├─ Catalog & Dynamic Menu        │   ├─ 16 Feature Modules & Quotas   │
│   ├─ Customers & CRM               │   ├─ App Configuration (📱)        │
│   ├─ Delivery & Dispatch Engine    │   ├─ Gatekeeper Evaluator          │
│   ├─ Fleet Core & Turnos           │   ├─ Product Flavors (🔒 Staged)   │
│   ├─ Telemetría GPS en Vivo        │   ├─ Build Engine (🔒 Staged)      │
│   ├─ Notificaciones Push FCM       │   └─ Release Manager (🔒 Staged)   │
│   ├─ Transactional Email SMTP      │                                    │
│   ├─ AI & Assistant Logic          │                                    │
│   └─ Performance & DB Optimization │                                    │
└────────────────────────────────────┴────────────────────────────────────┘
```

---

## 3. Principio Fundamental e Inviolable (The Golden Rule)

### Regla de Integración Maestra:
1. **De Track A a Track B:**  
   Toda mejora funcional, corrección de bugs o salto de rendimiento desarrollado en el Core (Track A) beneficia automáticamente a todas las soluciones comerciales (Marketplace, Agency, Fitoni Express, White Label, Enterprise) sin necesidad de reescribir ni duplicar el código.
   
   $$\text{MEJORA FUNCIONAL} \longrightarrow \text{CORE} \longrightarrow \text{TODOS LOS PRODUCTOS COMERCIALES}$$

2. **Prohibición Expresa de Forks:**  
   Queda terminantemente prohibido bifurcar el código (`fork`), crear ramas ad-hoc por cliente o compilar APKs a partir de fuentes desalineadas. Cualquier especificidad de un cliente debe resolverse exclusivamente mediante:
   $$\text{TENANT} + \text{BRAND} + \text{SUBSCRIPTION} + \text{FEATURES} + \text{APP CONFIG} + \text{GATEKEEPER}$$

3. **Independencia Operativa de Tracks:**  
   - Ninguna actividad de transformación comercial (Track B) puede frenar, retrasar, duplicar ni degradar la evolución continua del Core funcional (Track A).
   - Ninguna evolución del Core (Track A) puede vulnerar el aislamiento multi-tenant, la seguridad de Gatekeeper ni los contratos congelados (ADRs 013 a 017).

---

## 4. Matriz de Estados de la Plataforma

| Componente / Capa | Track | Estatus Oficial | Mecanismo de Control |
|---|:---:|:---:|---|
| **Delivery Core v2.2** | Track A | 🟢 **ACTIVO CONTINUO** | Git Trunk / Single Codebase |
| **Merchant Control Tower** (ADR-013) | Track A | 🔒 **CONGELADO BASELINE** | Leaflet / 0 Maps Cost |
| **X→Y Location Engine** (ADR-015) | Track A | 🔒 **CONGELADO BASELINE** | Android Native Geocoder |
| **Courier Fleet Core** (ADR-016) | Track A | 🔒 **CONGELADO BASELINE** | Telemetría 5s/60s Canónica |
| **Transactional Email** (ADR-017) | Track A | 🔒 **CONGELADO BASELINE** | SMTP 465 / 10 Plantillas |
| **Brand Manager (Act #21)** | Track B | 🟢 **100% CERTIFICADO** | `/brands` / Storage Rules |
| **Subscription Manager (Act #22)** | Track B | 🟢 **100% CERTIFICADO** | `/subscriptions` / Gatekeeper |
| **App Config Manager (C2D.23)** | Track B | 🟢 **100% CERTIFICADO** | `/app_configs` / Build Barrier |
| **Product Flavors & Build Engine** | Track B | 🔒 **STAGED (WAITING AUTHORIZATION)** | Gradle / Flavors futuros |
| **Deployments & Rollout (ADR-014)** | Track B | 🔒 **STAGED (NO AUTO-ROLLOUT)** | Human Authorization Only |

---

## 5. Criterios de Aceptación para Futuras Actividades

Toda solicitud o tarea futura en el repositorio deberá clasificarse explícitamente en:
- **Tipo A (Mejora al Core):** Modifica lógica de negocio compartida bajo la premisa de "desarrollar una vez, potenciar a toda la plataforma".
- **Tipo B (Capacidad Comercial / Plataforma):** Añade o refina herramientas de parametrización, gobernanza, empaquetado o facturación sin tocar la lógica funcional base.

```
============================================================
ADR-018: PARALLEL EVOLUTION RULE IS NOW OFFICIALLY ACTIVE
ONE CORE / ONE CODEBASE / ZERO FORKS / DUAL TRACK EVOLUTION
============================================================
```
