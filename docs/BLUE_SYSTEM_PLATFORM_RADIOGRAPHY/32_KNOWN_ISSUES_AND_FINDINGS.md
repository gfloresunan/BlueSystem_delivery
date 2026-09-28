# 32 — KNOWN ISSUES, FINDINGS & DOCUMENTATION DRIFT

**Audit Mode:** ZERO MUTATION / DOCUMENT ONLY  
**Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## 🔍 Forensic Findings & Discrepancies Registry

### FIND-001: Documentation Drift — Cartography Engine
- **Historical Docs:** Several early architecture docs mentioned "Google Maps JavaScript API" for Merchant Web.
- **Active Code Truth:** Merchant Web strictly utilizes **Leaflet with CartoDB Voyager** tiles (`LiveMap.tsx`), achieving zero map API billing.
- **Status:** `DOCUMENTATION_DRIFT` (Code is superior to legacy docs).

### FIND-002: Documentation Drift — Panel Admin Tech Stack
- **Historical Docs:** Some docs labeled `panel-admin` as a Vite/React application.
- **Active Code Truth:** `panel-admin` is structured as a modular Enterprise Single Page Application (SPA) using vanilla JavaScript modules and TailwindCSS in `panel-admin/public/`.
- **Status:** `DOCUMENTATION_DRIFT` (Documented reality reflects active SPA).

### FIND-003: Physical Device Touch Inset Optimization (Customer AI)
- **Problem:** Chat input bar in `CustomerAIScreen.kt` required explicit `imePadding()` and `navigationBarsPadding()` to prevent soft keyboard overlap on Samsung foldable devices.
- **Evidence:** Documented and certified in `C3N_UX_FIX_02_CHAT_INPUT_PHYSICAL_DEVICE_REPORT.md`.
- **Status:** 🟢 `RESOLVED / CERTIFIED IN BASELINE`.

---
*Evidence: active inspection comparing legacy docs with active codebase.*
