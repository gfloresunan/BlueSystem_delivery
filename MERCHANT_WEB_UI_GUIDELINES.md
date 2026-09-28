# MERCHANT_WEB_UI_GUIDELINES.md
## Guía de Experiencia de Usuario y Diseño Desktop

## 🎨 1. Principios Visuales
1. **Modo Oscuro Nativo**: Tema primario `Slate-900` / `Dark Obsidian` con acentos en Azul Eléctrico (`#3B82F6`) y Verde Neón (`#10B981`) para métricas activas.
2. **Layout Adaptativo Desktop**: Diseñado específicamente para pantallas de 13" a 32" y optimizado para Galaxy Z Fold en estado desplegado.
3. **Sidebar Izquierda Fijada**: Navegación principal persistente con acceso a los 12 módulos operacionales.
4. **TopBar Informativa**: Muestra el nombre del negocio activo, sucursal seleccionada, estado del restaurante (Abierto/Cerrado), notificaciones y perfil de usuario EIAM.

---

## 🖥️ 2. Estructura del Layout General

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Logo Merchant] | [Comercio: Tip Top] [Sucursal: Centro] [👤] │
├───────────────┬────────────────────────────────────────────────────────┤
│ SIDEBAR       │ WORKSPACE / CONTENIDO DEL MÓDULO                       │
│ - Dashboard   │                                                        │
│ - Pedidos     │  [KPI Cards] [Gráficos] [Tablas Virtualizadas]        │
│ - Control Tower│                                                       │
│ - Catálogo    │                                                        │
│ - Promociones │                                                        │
│ - Clientes    │                                                        │
│ - Finanzas    │                                                        │
│ - Config      │                                                        │
│ - Personal    │                                                        │
│ - Reportes    │                                                        │
│ - Comunicación│                                                        │
│ - Ayuda       │                                                        │
└───────────────┴────────────────────────────────────────────────────────┘
```
