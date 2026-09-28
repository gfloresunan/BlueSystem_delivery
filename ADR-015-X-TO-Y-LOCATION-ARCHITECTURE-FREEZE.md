# ADR-015: X→Y LOCATION ARCHITECTURE FREEZE & IMMUTABILITY BASELINE

## Metadata
- **Status**: 🟢 **ACCEPTED / FROZEN (IMMUTABLE BASELINE v2.2 ENTERPRISE)**
- **Date**: 2026-08-24
- **Sprint**: C27 (Location Provider & Physical Device Validation)
- **Scope**: `SolicitarEnvioScreen.kt`, `Models.kt`, `GeoUtils.kt`, Customer App Location Subsystem
- **Author**: Senior Developer & Auditor BlueSystem v2.1 Enterprise

---

## 1. Context & Problem Statement
During Sprint C26 and C27, the **X→Y Location Experience** was audited and certified on physical hardware (**Samsung Galaxy Z Fold 5**), achieving:
1. **Safe Area & Viewport Insets**: Total visibility and accessibility of map controls and confirmation buttons above Android navigation bars.
2. **Three Decoupled Selection Methods**: Search with debounce and race condition protection, interactive map picker with center pin & live reverse geocoding, and direct hardware GPS with accuracy threshold validation.
3. **Atomic State Synchronization**: Prevention of the `Address A + Coordinates B` desynchronization bug via indivisible `(address, latitude, longitude, source)` updates.
4. **$0.00 Cartographic Operating Cost**: Full reliance on Android Native Geocoder with geographical biasing to Managua/Nicaragua, avoiding recurring Google Places API fees ($17.00 - $25.00 / 1,000 requests) and eliminating the architectural hazard of two competing location engines.

To protect this mission-critical baseline against future unauthorized or purely cosmetic modifications ("*let's add Google Places because it looks more professional*"), a formal **Architecture Freeze** is declared.

---

## 2. Decision: Immutable Frozen Components

The following technical components and behavioral contracts are **FROZEN IN PLACE**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 FROZEN X→Y LOCATION ARCHITECTURE (ADR-015)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Android Native Geocoder (`android.location.Geocoder` + biasing)          │
│ 2. Map Picker Dialog (`WindowInsets.safeDrawing` + `navigationBarsPadding`) │
│ 3. Center Pin Fixed Anchor (Debounced 400ms reactive reverse geocoding)     │
│ 4. FusedLocationProviderClient (Hardware GPS fix with <100m accuracy gate)  │
│ 5. Saved Addresses Integration (`users/{uid}/addresses` atomic hydration)  │
│ 6. Atomic X/Y State (`(address, latitude, longitude, source)`)              │
│ 7. Haversine Distance Engine (`GeoUtils.calculateDistance`)                │
│ 8. Pricing Engine ($\text{Base } C\$35 + \text{km} \times C\$15$)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mandatory 10-Point Governance Protocol

**No future modification, refactoring, or third-party SDK integration (including Google Places SDK) may be introduced into this subsystem without an approved ADR demonstrating all 10 required criteria:**

1. **Problema Real**: Concrete, objective demonstration of a failure or technical bottleneck in the current native engine that cannot be resolved within the existing architecture.
2. **Beneficio Medible**: Quantifiable KPI improvement in conversion rate, latencia ($<100\text{ms}$), or geocoding accuracy.
3. **Riesgo Operativo**: Exhaustive failure mode analysis and automated rollback / fallback protocol.
4. **Impacto Económico**: Comprehensive financial ROI analysis factoring in API costs per active monthly user.
5. **Impacto UX**: Visual proof of non-regression in touch targets, ergonomics, keyboard handling, and Safe Area insets across phone and foldable viewports.
6. **Regresión C23**: Verification that the Physical E2E Trip contract (`/deliveryTrips` SoT) remains 100% compliant.
7. **Regresión C24**: Verification that the 20/20 production resilience pillars (recovery, stale GPS, offline, FCM) remain intact.
8. **Regresión C26**: Verification that the Map UX, debounce, and query sequence indexing remain functional.
9. **Regresión C27**: Verification that benchmark accuracy against Managua ground truth POIs is preserved.
10. **Physical E2E**: Physical verification on real hardware (Galaxy Z Fold 5 or equivalent target device).

---

## 4. Consequences & Guarantees
- **Engineering Isolation**: Eliminates the risk of developers creating competing location state machines.
- **Predictable Financial Overhead**: Guarantees zero surprise bills from Maps/Places billing quotas.
- **Strict Compliance**: Enforced as a top-priority workspace rule in `.agents/AGENTS.md`.
