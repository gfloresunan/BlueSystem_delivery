# MERCHANT_WEB_ARCHITECTURE.md
## Arquitectura General del Merchant Web Portal v1.0

## 🏛️ 1. Diagrama de Capas de la Plataforma

```
                        BlueSystem Platform
                                 │
                               EIAM (Identity & Access)
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   Android App             Merchant Web             panel-admin
(Motorizado/Cliente)   (merchant.bluesystem.app) (admin.bluesystem.app)
                                 │
                    Enterprise Business Engines
                                 │
┌─────────────────────────────────────────────────────────────────┐
│ Restaurant Menu Engine │ Merchant Operations │ Merchant Finance │
│ Delivery Control Tower │ Product Wizard      │ Settings Center  │
│ Communication Platform │ Policy Engine       │ EIAM SDK         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 2. Estructura de Proyecto (`merchant-web/`)

```
merchant-web/
├── src/
│   ├── app/                # Providers de Contexto (Auth, Theme, QueryClient)
│   ├── pages/              # Vistas principales por módulo
│   ├── components/         # Componentes UI reutilizables
│   ├── modules/            # Controladores de lógica de cada módulo
│   ├── shared/             # Constantes, tipos y helpers
│   ├── hooks/              # Custom Hooks de React (useAuth, useOrders, etc.)
│   ├── services/           # Adaptadores Firestore y EIAM SDK
│   ├── repositories/       # Capa de datos y consultas Firestore
│   ├── routes/             # Enrutamiento React Router v6 con Guardias
│   ├── layouts/            # MainLayout (Sidebar + TopBar + Workspace)
│   └── styles/             # CSS Tailwind & Variables globales
```

---

## ⚙️ 3. Decisiones Tecnológicas
- **Frontend Core**: React 18 con TypeScript en modo estricto.
- **Build Tool**: Vite (Carga ultra rápida HMR < 100ms).
- **Enrutamiento**: React Router DOM v6 con Code Splitting (`React.lazy`).
- **Estado Asíncrono**: TanStack Query (React Query v5) con caché inteligente ADR-003.
- **Formularios & Validación**: React Hook Form + Zod.
- **Estilos**: TailwindCSS + Framer Motion para microanimaciones.
- **Componentes Gráficos**: Chart.js / Recharts.
- **Mapas**: Leaflet / Google Maps JS SDK.
