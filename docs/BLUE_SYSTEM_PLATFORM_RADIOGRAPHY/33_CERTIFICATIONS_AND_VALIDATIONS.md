# 33 — HISTORICAL CERTIFICATIONS, ADRS & AUDIT LOGS

**Baseline:** Enterprise v2.2 Certified Baseline  
**Sprint Evolution:** Sprint 13B through Sprint 18.1  
**Architecture Decision Records (ADRs):** ADR-001 through ADR-016

---

## 📜 Architectural Decision Records (ADRs) Summary

| ADR ID | Title | Core Invariant Enforced | Status |
|---|---|---|---|
| **ADR-003** | Performance, Cost & Scalability | Zero $N+1$ queries, aggregated summaries, menu versioning, 90-day archive. | 🟢 `ACTIVE` |
| **ADR-011** | Customer Gemini AI Integration | Direct Firebase AI Logic, markdown rendering, deep-link action chips. | 🟢 `CERTIFIED` |
| **ADR-013** | Merchant Control Tower Freeze | Leaflet + CartoDB Voyager cartography, diffing GPS listeners, 0 map cost. | 🔒 `FROZEN BASELINE` |
| **ADR-014** | No Auto-Rollout Governance Policy | Zero automated custom claims or canary mutation without explicit human order. | 🔒 `FROZEN POLICY` |
| **ADR-015** | X→Y Location & Map Picker Freeze | Native Geocoder, safe area window insets, central pin, Haversine engine. | 🔒 `FROZEN BASELINE` |
| **ADR-016** | Courier Core & Fleet Freeze | `FleetEligibilityEngine`, 5s/60s GPS sync, atomic `claimOrderAtomically`. | 🔒 `FROZEN BASELINE` |

---
*Evidence: verified against workspace ADRs and Sprint certification reports.*
