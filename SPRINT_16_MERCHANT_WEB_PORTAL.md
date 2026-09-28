# SPRINT 16 — Merchant Web Portal Enterprise v1.0
## Declaración Oficial del Sprint

**Versión:** 1.0  
**Estado:** Diseño e Implementación  
**Prioridad:** P0 (Enterprise Core)  
**Tipo:** Web Application (Propietarios, Gerentes y Personal de Comercio)  

---

## 📌 1. Visión y Objetivos

El **Merchant Web Portal Enterprise** es una aplicación web profesional independiente concebida exclusivamente para la gestión integral de comercios y restaurantes registrados en la plataforma **BlueSystem Delivery Enterprise**.

### Objetivos Clave:
1. **Independencia Arquitectónica Total**: Operación 100% autónoma en `merchant-web/` sin alterar `panel-admin/` ni los motores legados (*Frozen Core*).
2. **Administración Desktop Completa**: Permite controlar los 12 módulos operativos del negocio desde cualquier navegador de escritorio o laptop.
3. **Seguridad Multi-Tenant EIAM**: Garantiza que ningún comercio pueda visualizar o mutar datos pertenecientes a otros tenants.
4. **Reutilización de Lógica Enterprise**: Consume los motores de finanzas, catálogo, delivery, comunicaciones y configuración existentes sin duplicar reglas de negocio.

---

## 🛑 2. Regla de Oro de Arquitectura y Frozen Core

### Aislamiento de Proyectos Web
- `panel-admin/` → BackOffice Global de la Plataforma BlueSystem (NO MODIFICAR).
- `merchant-web/` → Portal Exclusivo para Comercios (NUEVO PROYECTO).

### Motores Congelados (Consumo Vía Interfaces/SDK):
- Serie 13B (Restaurant Commerce)
- Hito 14 (KDS)
- Sprint 14.0 (Optimization & Smart Caching)
- Sprint 14.1 (Enterprise Platform)
- Sprint 14.4 / 14.5 (Enterprise Communication Platform)
- Sprint 15.0 (Product Wizard)
- Sprint 15.1 (Merchant Dashboard Engine)
- Sprint 15.2 (Merchant Orders Operations Center & Delivery Control Tower)
- Sprint 15.5 (Restaurant Settings Center)
- Sprint 15.7 (Merchant Finance Center)
- EIAM (Enterprise Identity & Access Management v2.1)

---

## 🧩 3. Módulos Operacionales Integrados

1. **Merchant Dashboard**: KPIs, ventas, alertas de stock, métricas SLA, pedidos activos.
2. **Merchant Orders Operations Center**: Vista Kanban/Lista, asignación de motorizados, reembolsos e incidencias.
3. **Delivery Control Tower**: Mapa en vivo, tracking de motorizados, alertas de atraso y KDS.
4. **Catálogo & Restaurante (Product Wizard)**: Creación de menú, variantes, extras, combos y publicación de versiones.
5. **Promociones (Engine 13B.6)**: 2x1, Happy Hour, Cupones y Delivery Gratis.
6. **Clientes (Customer Intelligence)**: Historial de pedidos, clientes VIP y comentarios.
7. **Finanzas (Merchant Finance Center)**: Desglose de ventas, comisiones, propinas, utilidades y liquidaciones.
8. **Configuración (Restaurant Settings Center)**: Información comercial, horarios, delivery, métodos de pago e impuestos.
9. **Personal (Merchant Staff Center)**: Empleados, invitaciones multicanal, asignación de roles y permisos por sucursal.
10. **Reportes**: Exportaciones en CSV/Excel/PDF de rendimiento comercial.
11. **Comunicación (ECP Integration)**: Plantillas y campañas por WhatsApp, SMS, Push y Email.
12. **Seguridad EIAM**: Control de acceso granular por Custom Claims JWT y RBAC/ABAC.
