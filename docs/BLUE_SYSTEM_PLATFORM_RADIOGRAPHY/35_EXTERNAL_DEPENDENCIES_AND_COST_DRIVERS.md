# 35 — EXTERNAL DEPENDENCIES & OPERATIONAL COST DRIVERS

**Audit Reference:** COST-001  
**Infrastructure Provider:** Google Cloud & Firebase

---

## 💸 Operational Cost & Billing Drivers Analysis

| Service / Dependency | Provider | Billing Model | Platform Driver & Optimization |
|---|---|---|---|
| **Google Maps SDK (Android)** | Google Maps Platform | Per Map Load | Used in mobile app. Zero cost for geocoding via native OS Geocoder. |
| **Web Map (Control Tower)** | CartoDB / OSM (Leaflet) | **Free / Zero Cost** | Fully eliminates Google Maps JS API cost ($7.00/1000 loads) on Web. |
| **Cloud Firestore** | Firebase / GCP | Reads, Writes, Storage | Mitigated by menu versioning (ADR-003) and 5s/60s GPS throttling. |
| **Cloud Functions v2** | Google Cloud Run / Functions | Invocations & GB-seconds | Node.js 18 with 256MB lightweight instances. |
| **Firebase Cloud Messaging** | Google Firebase | **Free / Included** | Zero per-message delivery charge. |
| **Firebase AI Logic / Gemini** | Google Cloud Vertex AI | Input / Output Tokens | Customer assistant requests throttled and scoped. |
| **Cloud Storage** | Google Cloud Storage | GB Stored & Network Egress | Images compressed before upload on mobile and web. |

---
*Evidence: inspection of cloud dependency footprints and architectural ADRs.*
