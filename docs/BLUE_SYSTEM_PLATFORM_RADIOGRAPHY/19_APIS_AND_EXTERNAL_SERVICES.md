# 19 — APIS AND EXTERNAL SERVICES INVENTORY

**System:** BlueSystem Delivery Enterprise  
**Audit Protocol:** BSD-MASTER-PLATFORM-RADIOGRAPHY-UXUI-001

---

## 🌐 External APIs & SDKs Master Registry

| API ID | Service / API Name | Provider | Purpose & Usage Area | Authentication / Key | Potential Cost Driver | Fallback Mechanism |
|---|---|---|---|---|---|---|
| **API-001** | Google Maps SDK for Android | Google | Native map rendering in Customer & Courier mobile apps | `MAPS_API_KEY` in AndroidManifest | Map loads (Free tier/credits) | Native Canvas placeholder |
| **API-002** | Google Native Geocoder | Android OS | Reverse geocoding of GPS coordinates to street addresses | Android System Service (No API Key) | **Zero Cost** | Lat/Lng string display |
| **API-003** | Leaflet + CartoDB Voyager | OpenStreetMap / Carto | Web Control Tower map in Merchant Web and Admin Panel | None (Public tile server) | **Zero Cost** | Static grid view |
| **API-004** | Firebase Cloud Messaging (FCM) | Google Firebase | Real-time push notifications across mobile and web | Service Account / Firebase Admin SDK | Free tier / Standard quota | In-app Firestore snapshot listener |
| **API-005** | Firebase AI Logic / Gemini Pro | Google Cloud Vertex AI | Natural language customer shopping assistant (`CustomerAIScreen`) | Firebase Auth / Vertex AI SDK | Input/Output token usage | Standard search bar |
| **API-006** | Cloud Storage for Firebase | Google Cloud | Storage of menu item images, driver documents, POD vouchers | Firebase Storage Rules | GB storage & download bandwidth | Default asset placeholders |

---
*Evidence: verified in `AndroidManifest.xml`, `functions/src/`, and `merchant-web/src/components/DeliveryControlTowerModule.tsx`.*
