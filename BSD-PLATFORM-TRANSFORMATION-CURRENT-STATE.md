# BSD — CURRENT STATE ASSESSMENT (ESTADO REAL DEL SISTEMA)
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 PRE-IMPLEMENTATION STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY / FORENSIC / ZERO-MUTATION / ZERO-DEPLOYMENT / ZERO-CLAIMS`  
**Date:** Agosto 2026  
**Auditor:** Senior Developer & Enterprise Platform Auditor  

---

## 1. RESUMEN EJECUTIVO
BlueSystem Delivery ha completado con éxito la fase **C2D.21**, alcanzando una flota operacional activa de **3 Tenants en Canary** bajo estricto aislamiento multi-tenant (`ten-live-commercial-01`, `ten-live-commercial-02`, `ten-live-commercial-03`).

La radiografía técnica forense confirma que el sistema cuenta con:
- **4 Plataformas Operativas:** Customer App (Android Kotlin Compose), Courier App (Android Kotlin Compose), Merchant Web (React 18 + TS + Tailwind), Admin Web (Vanilla JS SPA + Tailwind).
- **Backend Unificado:** Firebase Auth + Firestore + Cloud Functions TypeScript (104 exportaciones / funciones) + Cloud Storage + FCM + Google Maps Native + Gemini AI Gateway.
- **Seguridad & EIAM:** `firestore.rules` con 1,107 líneas de reglas declarativas RBAC/ABAC (EIAM v2.2 / v3), Custom Claims JWT jerárquicos y aislamiento multi-tenant.
- **5 Contratos Congelados Inmutables:** Control Tower (ADR-013), No Auto-Rollout (ADR-014), X→Y Location Engine (ADR-015), Courier Fleet Core (ADR-016), Transactional Email Core (ADR-017).

---

## 2. REALIDAD TÉCNICA: ¿QUÉ ES MOTOR COMERCIAL Y QUÉ ES ESPECÍFICO DE CANARY?

| Dimensión | Realidad en Código | Diagnóstico Forense |
|---|---|---|
| **One Core Codebase** | 🟢 `REAL / OPERATIONAL` | Un único repositorio alberga todas las aplicaciones y funciones sin bifurcaciones (*zero forks*). |
| **Aislamiento Multi-Tenant Firestore** | 🟢 `REAL / OPERATIONAL` | Consultas filtradas por `tenantId` / `businessId`, reglas de seguridad `isTenantMember()` y transacciones atómicas. |
| **Modelos de Dominio Multi-Brand / Multi-Modelo** | 🟢 `REAL / OPERATIONAL` | Schemas TypeScript completos en `functions/src/domain/platform/models.ts` (`TenantEntity`, `BrandEntity`, `SubscriptionEntity`, `AppConfigEntity`, `ReleaseEntity`). |
| **Evaluador Gatekeeper (Backend & Web)** | 🟢 `REAL / OPERATIONAL` | `functions/src/domain/gatekeeper/gatekeeper.ts` y `merchant-web/src/shared/gatekeeper/useGatekeeper.ts` implementan: `EFFECTIVE_ACCESS = ROLE ∩ ENTITLEMENTS ∩ TENANT`. |
| **Brand Hydration Web** | 🟢 `REAL / OPERATIONAL` | Inyección dinámica de variables CSS y tokens de marca en tiempo de ejecución en `merchant-web`. |
| **Brand Hydration Android** | 🟡 `PARTIAL` | `BrandHydrationResolver.kt` y `BrandThemeProvider.kt` implementados, pero `MainActivity.kt` aún inicializa con el tema estático `MyApplicationTheme`. |
| **Brand Manager (UI Admin)** | 🔴 `MISSING` | No existe interfaz visual en `panel-admin` para crear/editar marcas o cargar logos/colores. |
| **Subscription Manager (UI Admin)** | 🔴 `MISSING` | No existe interfaz visual en `panel-admin` para planes, cotas y asignación de suscripciones. |
| **Android Build / Flavors Engine** | 🔴 `MISSING` | `app/build.gradle.kts` posee un único `applicationId = "com.aistudio.delivery.djweq"`, sin `productFlavors` ni pipeline CI/CD de compilación multi-marca. |
| **App Configuration Manager** | 🔴 `MISSING` | Los identificadores de apps, llaves de mapas y canales FCM están en archivos estáticos (`strings.xml`, `build.gradle.kts`, `google-services.json`). |

---

## 3. ESTADO OPERACIONAL DE FLOTA (3 TENANTS)
1. **Tenant 01 (`ten-live-commercial-01`):** 🟢 Operacional y certificado en producción.
2. **Tenant 02 (`ten-live-commercial-02`):** 🟢 Operacional y certificado en producción.
3. **Tenant 03 (`ten-live-commercial-03`):** 🟢 Operacional en canary controlado (C2D.21).
4. **Tenant 04 (`ten-live-commercial-04`):** 🔒 **ESTRICTAMENTE NO AUTORIZADO / INEXISTENTE**.

---

## 4. CONCLUSIÓN DE ESTADO
El Core de BlueSystem Delivery **YA POSEE los cimientos arquitectónicos y de datos para ser una plataforma multi-comercial**, pero actualmente opera con **aprovisionamiento programático/backend** y carece de las consolas de gestión visual (Brand/Subscription/AppConfig Managers) y de la infraestructura de compilación automatizada de Android (Flavors/CI/CD).
