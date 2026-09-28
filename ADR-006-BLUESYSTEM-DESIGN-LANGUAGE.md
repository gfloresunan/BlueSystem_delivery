# ADR-006: BlueSystem Design Language (BDL) v2.0 — Arquitectura Visual Inteligente y Semántica Contextual

**Estado:** `OFICIAL (DE CUMPLIMIENTO OBLIGATORIO)`  
**Versión:** `2.0.0`  
**Fecha:** `7 de Agosto de 2026`  
**Autores:** Equipo de Arquitectura, UI/UX y Dirección Tecnológica BlueSystem Enterprise  
**Relación:** Complementa y expande a [ADR-005 (Design System v1.0)](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ADR-005-BLUESYSTEM-DESIGN-SYSTEM.md)  
**Compatibilidad:** `Android (Material Design 3 / Jetpack Compose)` · `Web React (TailwindCSS)` · `Flutter (futuro)`  
**Afecta a:** Todos los módulos del ecosistema (Cliente, Comercio, Repartidor, Administrador, Analytics, BlueSystem AI, Configuración)

---

## 1. Contexto y Evolución (BDL v2.0)

A partir del presente hito, BlueSystem Enterprise v2.1 evoluciona formalmente de un **Design System tradicional (BSDS - ADR-005)** a un **Design Language Empresarial (BDL v2.0)**. 

Un sistema tradicional define componentes y tokens; un **lenguaje de diseño (Design Language)** comunica significado, intención y contexto de manera instintiva antes de que el usuario tenga que leer una sola palabra.

### Objetivo Principal
**Reconocimiento de pantalla en menos de 3 segundos (< 3s).**  
Toda la plataforma comunica el estado del negocio, el tipo de módulo y la criticidad de la información mediante una semántica de colores, bordes acentuados, iconografía exclusiva, Motion Design y efectos visuales de Glow/Glassmorphism sin generar ruido visual.

---

## 2. Los 7 Contextos Semánticos Oficiales

Cada módulo y componente debe identificarse instantáneamente según uno de los 7 contextos semánticos oficiales:

| Contexto | Color Principal | Código HEX | Iconografía Exclusiva | Ámbitos de Aplicación | Emoción / Significado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 🟢 **Operación** | Verde | `#22C55E` | `storefront`, `shopping_cart`, `inventory`, `check_circle`, `schedule` | Pedidos, Inventario, Estado de Local, Disponibilidad, Productos | "Todo está funcionando correctamente" |
| 🟡 **Finanzas** | Dorado | `#F59E0B` | `payments`, `account_balance_wallet`, `sell`, `receipt_long`, `paid` | Ventas, Caja, Ganancias, Comisiones, Facturación, Reportes | "Flujo de dinero y salud económica" |
| 🔵 **Clientes** | Azul | `#2563EB` | `groups`, `person`, `favorite`, `reviews`, `loyalty` | Clientes, Reseñas, VIP, Fidelización, Perfil | "Información y lealtad del consumidor" |
| 🩵 **Delivery** | Celeste | `#06B6D4` | `delivery_dining`, `two_wheeler`, `location_on`, `route`, `map` | Motorizados, GPS, Mapa en tiempo real, Rutas, ETA | "Movimiento y despacho en tiempo real" |
| 🟠 **Cocina** | Naranja | `#F97316` | `restaurant`, `skillet`, `timer`, `restaurant_menu`, `local_dining` | KDS (Kitchen Display System), Preparación, Tiempos de producción | "En proceso activo de preparación" |
| 🟣 **IA** | Índigo | `#4F46E5` | `psychology`, `auto_awesome`, `bolt`, `smart_toy` | BlueSystem AI, Insights, Predicciones, Copilot | "Inteligencia, automatización y sugerencias" |
| 🔴 **Seguridad** | Rojo | `#EF4444` | `security`, `warning`, `shield`, `error`, `bug_report` | Alertas de riesgo, Auditoría EIAM, Errores, Detección de fraude | "Urgencia, riesgo o atención inmediata" |
| ⚪ **Offline / Inactivo** | Gris | `#6B7280` | `wifi_off`, `cloud_off`, `pause_circle` | Estado sin conexión, Sincronización pendiente, Elementos pausados | "Operación local o deshabilitada" |

---

## 3. Especificación de Componentes Contextuales

Todas las tarjetas (`BSCard`) y componentes visuales expondrán su contexto mediante un código visual compuesto por: **Color de Borde Lateral, Icono Exclusivo, Tono de Superficie Suave, Glow y Badges Contextuales**.

### Patrones Contextuales de Tarjeta (`BSContextCard`):
1. **Tarjeta Financiera (Dorado `#F59E0B`):** Borde izquierdo dorado de 4px, icono `account_balance_wallet`, valor numérico destacado en contraste profundo.
2. **Tarjeta de Operación / Pedidos (Verde `#22C55E`):** Borde verde de 4px, badge de estado verde suave, icono de carrito/inventario.
3. **Tarjeta de Delivery (Celeste `#06B6D4`):** Borde celeste de 4px, icono de motorizado (`two_wheeler`), estimador de tiempo y coordenadas GPS.
4. **Tarjeta de Cocina (Naranja `#F97316`):** Borde naranja de 4px, temporizador SLA visible e icono `skillet`.
5. **Tarjeta de Seguridad / Riesgo (Rojo `#EF4444`):** Borde rojo de 4px, icono `shield`, badge de urgencia y microanimación de pulso (`Pulse`).
6. **Tarjeta de BlueSystem AI (Índigo `#4F46E5`):** Fondo con gradiente índigo, brillo exterior (`Glow`), partículas o destellos visuales e icono `auto_awesome`.

---

## 4. Jerarquía Vertical Inmutable del Dashboard (Dashboard Language)

Todos los dashboards del sistema (Comercio, Administrador, Cliente, Delivery, Analytics, Blue AI, Configuración) compartirán **exactamente el mismo framework estructural**. La experiencia no cambia; solo varía el contenido.

Queda estrictamente prohibido alterar el siguiente orden vertical:

```
    1. HEADER (TopBar + Conectividad)
       ↓
    2. SEARCH (SearchBar contextual)
       ↓
    3. ESTADO (Turno / Operación activa)
       ↓
    4. OBJETIVOS (Metas del día/mes)
       ↓
    5. KPIs (Grid de BSKpiCard por contexto)
       ↓
    6. OPERACIÓN (Resumen de pedidos/inventario)
       ↓
    7. FINANZAS (Ingresos / Cuentas por cobrar)
       ↓
    8. CLIENTES (Clientes activos / Reseñas)
       ↓
    9. DELIVERY (Despachos y repartidores en ruta)
       ↓
    10. ALERTAS (Riesgos, stock bajo, SLA)
       ↓
    11. ACTIVIDAD (Feed de transacciones en vivo)
       ↓
    12. BLUE AI (Insights y recomendaciones inteligentes)
       ↓
    13. ACCIONES RÁPIDAS (Accesos directos y menús desplegables en acordeón)
```

---

## 5. Lenguaje Visual de BlueSystem AI (Blue AI Language)

BlueSystem AI es el módulo central y diferencial de la plataforma. Para comunicar su naturaleza inteligente, **está estrictamente prohibido utilizar tarjetas o estilos estándar** en las secciones de IA.

### Directivas de Diseño de Blue AI:
* **Fondo y Superficie:** Gradiente sutil Índigo-Violeta (`#4F46E5` a `#3730A3`).
* **Efectos de Luz:** Borde translúcido con efecto *Glow* y resplandor exterior suave.
* **Iconografía:** Uso exclusivo de `auto_awesome`, `psychology` y `smart_toy`.
* **Microinteracción:** Botón de acción con destellos suaves y animación de pulso índigo al generar recomendaciones.
* **Sensación de Usuario:** El usuario debe sentir que interactúa con un co-piloto activo que razona y asesora en tiempo real.

---

## 6. Sistema de Tokens 2.0 (Design Tokens 2.0)

### Motion Tokens (Sistema de Tiempos de Animación)
* `Motion.Fast` — **150 ms** (Efectos hover, botones presionados, ripples).
* `Motion.Normal` — **250 ms** (Transiciones de pantalla, modales, menús en acordeón).
* `Motion.Slow` — **400 ms** (Entrada de tarjetas grandes, expansión de gráficos).
* `Motion.Spring` — **450 ms** (Rebote suave en alertas y badges dinámicos).

### Microinteracciones Estandarizadas
* **Hover:** Escala sutil de `102%` (`scale-102`).
* **Press:** Reducción de escala a `98%` (`scale-98`) y elevación reducida.
* **Skeleton Loading:** Animación de pulso tenue (*Fade Pulse*) en lugar de spinners infinitos.
* **Error / Riesgo:** Animación de sacudida leve (*Shake*).
* **AI Recommendation:** Destello resplandeciente (*Glow Pulse*).

---

## 7. Criterios de Evaluación "Blue Experience" (Checklist Pre-Aprobación)

Antes de fusionar o integrar cualquier pantalla en el ecosistema, debe responder afirmativamente a las siguientes 10 preguntas:

1. ✅ ¿El usuario entiende qué módulo está viendo en menos de tres segundos (< 3s)?
2. ✅ ¿Los colores comunican el contexto semántico adecuado (Verde, Dorado, Azul, Celeste, Naranja, Índigo, Rojo)?
3. ✅ ¿Los iconos pertenecen exclusivamente a `Material Symbols Rounded` y comunican el contexto?
4. ✅ ¿La jerarquía visual respeta estrictamente el Dashboard Language?
5. ✅ ¿Existe amplio espacio de respiración sin saturación de datos?
6. ✅ ¿Los botones principales de acción destacan claramente sobre los elementos secundarios?
7. ✅ ¿Las acciones secundarias están organizadas dentro del menú colapsable en acordeón?
8. ✅ ¿Las animaciones utilizan los Motion Tokens oficiales (150ms – 450ms)?
9. ✅ ¿Se respeta Material Design 3 y contraste AA en Modo Claro y Oscuro?
10. ✅ ¿Se reutilizan exclusivamente componentes BSDS y tokens BDL v2.0?

---

## 8. Gobernanza Distribuida (ADR-005 vs. ADR-006)

* **ADR-005 (Design System - BSDS v1.0):** Gobierna los cimientos técnicos (biblioteca de componentes reutilizables `BSButton`, `BSCard`, `BSKpiCard`, etc., código fuente, tokens base de Tailwind/Compose y reglas de reutilización de componentes).
* **ADR-006 (Design Language - BDL v2.0):** Gobierna la capa estratégica de comunicación visual (identidad semántica contextual por colores/iconos, lenguaje visual de Blue AI, Motion Design Tokens 2.0 y el checklist "Blue Experience").
