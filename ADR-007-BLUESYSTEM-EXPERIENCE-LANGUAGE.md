# ADR-007: BlueSystem Experience Language (BDL v3.0 / BEL) — Arquitectura Multisensorial e Inteligencia Dinámica

**Estado:** `OFICIAL (DE CUMPLIMIENTO OBLIGATORIO)`  
**Versión:** `3.0.0`  
**Fecha:** `7 de Agosto de 2026`  
**Autores:** Equipo de Arquitectura, UX Multisensorial y Dirección Tecnológica BlueSystem Enterprise  
**Relación:** Expande a [ADR-005 (Design System v1.0)](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ADR-005-BLUESYSTEM-DESIGN-SYSTEM.md) y [ADR-006 (Design Language v2.0)](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/ADR-006-BLUESYSTEM-DESIGN-LANGUAGE.md)  
**Compatibilidad:** `Android (Jetpack Compose / Haptics / SoundPool)` · `Web React (Web Audio API / Web Haptics / Tailwind)` · `Flutter (futuro)`  
**Afecta a:** Todos los módulos del ecosistema (Cliente, Comercio, Repartidor, Administrador, Analytics, BlueSystem AI, Configuración)

---

## 1. Contexto y Visión (BDL 3.0 / BEL)

Con el **BDL v3.0 (BlueSystem Experience Language - BEL)**, la interfaz trasciende el diseño puramente visual para convertirse en una **experiencia de usuario multisensorial (Visual, Táctil, Auditiva y Cognitiva)**.

### Objetivo Fundamental
Permitir que el comerciante, repartidor o administrador reconozca eventos críticos, estados del sistema e intenciones **incluso antes de mirar detenidamente la pantalla**, mediante retroalimentación táctil hháptica, señales sonoras exclusivas, movimiento con propósito y priorización cromática dinámica.

---

## 2. Los 8 Pilares de la Experiencia BDL 3.0 (BEL)

### 1. 🎬 Blue Motion (Lenguaje de Movimiento Vivo)
Toda interacción visual debe tener intención. Se definen 6 curvas de movimiento estándar:
* **Entrada de Cards:** Slide Up + Fade In en cascada con escalonamiento de 40ms por tarjeta.
* **Aparición de KPIs:** Transición de conteo numérico progresivo (`CountUp`) combinado con escala suave (102% a 100%).
* **Carga de Dashboards:** Carga estructural progresiva con Skeleton Pulse en lugar de bloqueos vacíos.
* **Respuesta de Blue AI:** Destello resplandeciente sutil (*Glow Pulse*) y animación de partículas o pulso de luz índigo.
* **Alerta Crítica / Riesgo:** Animación de vibración visual leve (*Shake*) para llamar la atención inmediata.
* **Transición de Estado:** Interpolación cromática suave (250ms) al cambiar un pedido de `PREPARING` a `READY` o de `ONLINE` a `OFFLINE`.

---

### 2. 🎵 Blue Sound (Identidad Auditiva Sutil)
Audio feedback minimalista de alta definición para operaciones clave, sin resultar intrusivo:
* 🟢 **`sound_new_order.mp3`**: Tono doble ascendente armónico (Pedido recibido).
* 🟡 **`sound_cash_closed.mp3`**: Chime metálico sutil (Cierre de caja / Venta concretada).
* 🔵 **`sound_ai_insight.mp3`**: Tono suave sintetizado de baja frecuencia (Nueva recomendación de Blue AI).
* 🔴 **`sound_alert_error.mp3`**: Tono grave doble de advertencia (Error de pago / Alerta de stock).

---

### 3. 📳 Blue Haptics (Patrones Hhápticos Contextuales)
Integración nativa con `Vibrator` / `HapticFeedback` en Android y Web Vibration API:
* **Pedido Aceptado / En Ruta:** Vibración corta de confirmación (`HapticFeedbackType.LongPress` / 50ms).
* **Dinero / Pago Recibido:** Pulso doble rápido (30ms - pausa 20ms - 30ms).
* **Error / Transacción Fallida:** Vibración de tres pulsos cortos de advertencia (40ms - 40ms - 40ms).
* **Alerta Crítica de Riesgo / SLA:** Vibración sostenida progresiva.

---

### 4. 📊 Blue Charts (Visualización de Datos de Experiencia)
Gráficos financieros y operativos con identidad propia:
* **Gradient Area & Line Charts:** Líneas de ingresos con gradientes dorados/azules y resplandor *Glow* en los puntos máximos.
* **Progress Rings & Donut Charts:** Anillos de preparación de cocina y ocupación de mesas con animación de llenado fluido.
* **Mini KPI Sparklines:** Gráficos diminutos integrados dentro de las tarjetas `BSKpiCard` para indicar la tendencia de los últimos 7 días.
* **HeatMaps Operativos:** Mapa de calor de horas pico de pedidos y entregas por zona.

---

### 5. 🤖 Blue AI Experience Layer (Co-piloto Vivo)
Blue AI deja de ser una tarjeta pasiva para transformarse en un **Asistente Conversacional Activo**:
* **Avatar Dinámico:** Indicador esférico Índigo con animación de pulso y resplandor activo.
* **Estados en Tiempo Real:**
  - 🔄 *`Pensando...`* (Animación de rotación de partículas)
  - 🔍 *`Analizando ventas e inventario...`* (Destello suave Índigo)
  - 💡 *`Recomendando acción...`* (Resplandor brillante y botón de ejecución instantánea)

---

### 6. 🎨 Blue Empty States (Ilustraciones Semánticas Propias)
Queda prohibido mostrar texto plano en pantallas sin datos. Cada estado vacío integrará una ilustración vectorial con el lenguaje de marca:
* 🍔 **Sin pedidos:** Ilustración de cocina ordenada esperando comandas.
* 📦 **Sin inventario:** Ilustración de estante listo para catálogo.
* 💰 **Sin ventas:** Ilustración de caja registradora en reposo.
* 🛵 **Sin repartidores:** Ilustración de mapa de rutas listo para despacho.
* ⭐ **Sin clientes:** Ilustración de libreta de contactos VIP.
* 🤖 **Sin recomendaciones AI:** Ilustración de Blue AI escaneando métricas.

---

### 7. ⚡ Blue Microfeedback (Interactividad Total)
**Cero elementos muertos.** Ninguna tarjeta, botón, tab o switch puede permanecer estático ante la interacción del usuario:
* **Cards:** Elevación instantánea y borde brillante al toque/hover.
* **Buttons:** Microescala `scale-98` al presionar con efecto Ripple nativo.
* **Badges & Tabs:** Desplazamiento fluido del indicador activo con easing elástico (*Spring*).

---

### 8. 🧠 Blue Intelligence Layer (Prioridad Cromática por Intensidad)
Los colores no solo comunican contexto; comunican **nivel de prioridad e intensidad de acción**:

| Tono Cromático | Nivel de Prioridad | Significado | Acción Requerida |
| :--- | :--- | :--- | :--- |
| 🟩 **Verde Claro / Suave** | Informativo | Operación regular, stock adecuado, sistema en línea | Ninguna |
| 🟢 **Verde Intenso / Neón** | Urgencia Positiva | Nueva orden entrante, pico de ingresos alcanzado | Aceptar pedido inmediato |
| 🟧 **Naranja / Naranja Intenso** | Advertencia Temp. | Pedido demorado en cocina, temporizador SLA en límite | Priorizar comanda |
| 🟥 **Rojo Tenue** | Advertencia de Riesgo | Stock bajo, intento de pago fallido | Revisar inventario |
| 🔴 **Rojo Intenso / Pulsante** | Acción Inmediata | Intento de fraude, desconexión de red, error crítico | Intervención requerida |

---

## 3. Matriz de Gobernanza del Ecosistema Visual (ADR-005 vs. ADR-006 vs. ADR-007)

* **ADR-005 (Design System - BSDS v1.0):** Define los cimientos técnicos, biblioteca de componentes reutilizables y tokens base.
* **ADR-006 (Design Language - BDL v2.0):** Define los 7 contextos semánticos cromáticos y la jerarquía inmutable de Dashboard.
* **ADR-007 (Experience Language - BDL v3.0 / BEL):** Governa la capa multisensorial (Motion Design, Sonido sutil, Hhaptics, Blue AI Co-piloto vivo, Prioridad por intensidad cromática y Microfeedback total).
