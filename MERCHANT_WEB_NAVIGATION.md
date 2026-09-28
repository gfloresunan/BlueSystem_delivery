# MERCHANT_WEB_NAVIGATION.md
## Estructura de Rutas y Navegación React Router v6

| Ruta | Módulo | Descripción | Guardias EIAM |
|------|--------|-------------|---------------|
| `/login` | Autenticación | Login de comerciantes | Público |
| `/dashboard` | Dashboard Operativo | KPIs, alertas y resumen en tiempo real | `EiamRole.CASHIER`+ |
| `/orders` | Centro de Pedidos | Kanban, tabla, incidencias y reembolsos | `EiamRole.CASHIER`+ |
| `/delivery` | Control Tower | Mapa de flota, ETA y KDS | `EiamRole.SUPERVISOR`+ |
| `/catalog` | Product Wizard | Menú, productos, variantes y extras | `EiamRole.MANAGER`+ |
| `/promotions` | Promociones 13B.6 | Cupones, 2x1 y delivery gratis | `EiamRole.MANAGER`+ |
| `/customers` | Inteligencia Clientes | Historial, clientes VIP | `EiamRole.MANAGER`+ |
| `/finance` | Merchant Finance Center | Ventas, comisiones y liquidaciones | `EiamRole.OWNER` / `MANAGER` |
| `/settings` | Settings Center (RSC) | Horarios, métodos de pago, branding | `EiamRole.OWNER` |
| `/staff` | Staff Center | Empleados, roles e invitaciones | `EiamRole.OWNER` |
| `/reports` | Reportes Operativos | Exportación CSV/Excel/PDF | `EiamRole.MANAGER`+ |
| `/communication` | Plataforma ECP | Campañas WhatsApp, Push, SMS | `EiamRole.OWNER` |
