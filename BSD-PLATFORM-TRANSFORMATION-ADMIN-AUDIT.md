# BSD — ADMIN WEB & PLATFORM MANAGEMENT COCKPIT AUDIT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. VISIÓN DEL ADMIN COCKPIT VS REALIDAD ACTUAL

El objetivo estratégico es que el Admin Web sea el **Cockpit Global de la Plataforma**:
```
GLOBAL ADMIN COCKPIT
│
├── 🏢 Tenants (Gestión de Empresas & Ciclo de Vida)
├── 🎨 Brands (Identidad Visual, Logos & Temas)
├── 📦 Commercial Models (Marketplace, Agency, White Label, Enterprise)
├── 💳 Subscriptions (Planes, Entitlements & Facturación)
├── ⚙️ Features (Feature Gates & Quotas)
├── 👤 Users & Roles (EIAM v3, RBAC + ABAC)
├── 📲 App Configuration (Package IDs, Maps, FCM & Secrets)
├── 🛠️ Android Builds (Compilación de APKs por Marca)
├── 🚀 Releases (Canary, Versionado & Distribución)
├── 🗺️ Operations & Live Map (Torre de Control de Flota)
├── 🔒 Security & Governance (Audit Logs, Claims, Risk Score)
└── ✉️ Transactional Email (Plantillas SMTP Corporativo)
```

---

## 2. AUDITORÍA FORENSE MÓDULO POR MÓDULO

| Módulo Admin | Archivo en `panel-admin/public/js/dashboard/` | Estado Actual | Diagnóstico Forense |
|---|---|---|---|
| **Dashboard KPI** | `dashboard.js`, `dashboardManager.js` | 🟢 `REAL` | Métricas operacionales en tiempo real. |
| **Governance Center** | `governanceCenter.js` (4,286 líneas) | 🟢 `REAL` | ABAC/RBAC, Organizaciones, Comercios, Sucursales, Usuarios, Roles, Permisos, Claims, Sesiones, Dispositivos, Riesgos (0-100), Auditoría. |
| **Live Map & Flota** | `liveMap.js`, `liveCouriers.js` | 🟢 `REAL` | Mapa Leaflet en tiempo real de motorizados y pedidos. |
| **Orders & Incidents** | `liveOrders.js`, `incidentsCenter.js` | 🟢 `REAL` | Gestión y resolución de incidencias en pedidos. |
| **Courier Cash Control** | `courierCashControl.js` (78KB) | 🟢 `REAL` | Arqueos, liquidaciones, límites de efectivo y depósitos bancarios. |
| **Email Templates** | `emailTemplates.js` (Actividad #20) | 🟢 `REAL` | 10 plantillas corporativas, motor de render y test SMTP. |
| **Banners & Promos** | `banners.js`, `promotions.js` | 🟢 `REAL` | Gestión de marketing para la app de clientes. |
| **Categorías & Menú** | `categories.js`, `dynamicMenu.js` | 🟢 `REAL` | Catálogos y menús administrables. |
| **Dominios Multi-Tenant**| `domains.js` (Fase 2E) | 🟢 `REAL` | Registro y verificación DNS de subdominios/dominios. |
| **Brand Manager** | Inexistente | 🔴 `MISSING` | Falta editor visual de marcas y paletas de color. |
| **Subscription Manager**| Inexistente | 🔴 `MISSING` | Falta editor de planes y asignación de cotas. |
| **App Config Manager** | Inexistente | 🔴 `MISSING` | Falta editor de configuraciones de compilación. |
| **Android Build Manager**| Inexistente | 🔴 `MISSING` | Falta disparador de compilación de APKs. |
| **Release Manager** | Inexistente | 🔴 `MISSING` | Falta consola de despliegues y canary progressivo. |

---

## 3. PLAN DE EVOLUCIÓN DEL ADMIN COCKPIT
Para transformar el Admin Web en el verdadero centro de control multi-comercial sin tocar los módulos operativos existentes que ya están funcionando y congelados:
1. **Crear sub-módulos dedicados** en `panel-admin/public/js/dashboard/`:
   - `brandManager.js`
   - `subscriptionManager.js`
   - `appConfigManager.js`
   - `releaseManager.js`
2. **Integrar con Firestore Collections** existentes: `/brands`, `/subscriptions`, `/app_configs`, `/releases`.
3. **Preservar intacto** el núcleo de `governanceCenter.js` y `liveMap.js`.
