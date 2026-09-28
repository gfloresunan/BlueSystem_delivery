# ADR-005: BlueSystem Design System (BSDS) v1.0 y Gobernanza Visual

**Estado:** `OFICIAL (DE CUMPLIMIENTO OBLIGATORIO)`  
**Versión:** `1.0.0`  
**Fecha:** `7 de Agosto de 2026`  
**Autores:** Equipo de Arquitectura y UI/UX BlueSystem Enterprise  
**Compatibilidad:** `Android (Material Design 3 / Jetpack Compose)` · `Web React (TailwindCSS)` · `Flutter (futuro)`  
**Afecta a:** Todos los módulos del ecosistema (Cliente, Comercio, Repartidor, Administrador, Analytics, BlueSystem AI, Configuración)

---

## 1. Contexto

Para consolidar la posición de **BlueSystem Enterprise v2.1** como plataforma de gestión comercial de alto nivel, es indispensable garantizar una experiencia de usuario (UX) fluida, consistente y visualmente extraordinaria. Previamente, las interfaces mantenían variaciones en radios de borde, tipografías y paletas de color entre clientes (Android Compose, Web React Admin y Merchant Web).

Este **ADR-005** formaliza el **BlueSystem Design System (BSDS) v1.0**, elevando la interfaz de usuario al rango de **activo arquitectónico de primer nivel**, con el mismo rigor de gobernanza que aplica a la seguridad (EIAM v2.2), los motores de negocio y la sincronización offline.

---

## 2. Filosofía del Diseño

BlueSystem transmite cinco valores fundamentales en cada pantalla:
* 🔹 **Confianza:** Claridad en datos financieros e inventario, sin sorpresas ni elementos ambiguos.
* 🔹 **Rapidez:** Microinteracciones de 200–300 ms, cargas optimizadas con Skeleton y retroalimentación táctil/visual instantánea.
* 🔹 **Simplicidad:** Jerarquía visual clara, eliminación de ruido innecesario y espacios de respiración amplios.
* 🔹 **Tecnología:** Estética "Enterprise Minimalist", microanimaciones pulidas e integración fluida de BlueSystem AI.
* 🔹 **Profesionalismo:** Consistencia milimétrica en espaciados, bordes, sombras y tipografía Poppins.

### Inspiraciones de Referencia
* Uber Eats Merchant & DoorDash Merchant (Operaciones de restaurante y despacho)
* Shopify & Stripe Dashboard (Métricas comerciales y financieras)
* Google Material 3 (Estructura de componentes y tokens)
* Notion & Linear (Poblado de datos denso pero limpio, comandos y menús colapsables)

---

## 3. Identidad Visual: Enterprise Minimalism

Concepto central: **Enterprise Minimalism**
* Mucho espacio de respiración (sistema base 4dp).
* Claridad visual máxima (tanto en fondos claros como en Modo Oscuro nativo completo).
* Identidad basada en la gama de azules corporativos.
* Mínima densidad visual por pantalla con soporte para expansión bajo demanda.

---

## 4. Tokens del Sistema de Diseño (Design Tokens)

### 🎨 Paleta Corporativa

#### Primarios
| Token | Código HEX | Descripción |
| :--- | :--- | :--- |
| `Blue 700` | `#2563EB` | Color de marca primario, botones principales, focos activos |
| `Blue 800` | `#1E40AF` | Hover primario, cabeceras enfatizadas |
| `Blue 900` | `#1E3A8A` | Fondos de tarjetas oscuras, contraste primario profundo |

#### Secundarios
| Token | Código HEX | Descripción |
| :--- | :--- | :--- |
| `Cyan` | `#06B6D4` | Acentos de datos, gráficos y badges secundarios |
| `Sky` | `#0EA5E9` | Indicadores de progreso y estados informativos suaves |
| `Indigo` | `#4F46E5` | Acentos de IA (BlueSystem AI) y funciones avanzadas |

#### Estados
| Estado | Código HEX | Uso |
| :--- | :--- | :--- |
| `Éxito` | `#22C55E` | Ventas exitosas, stock óptimo, repartidor conectado |
| `Advertencia` | `#F59E0B` | Stock bajo, alerta de SLA, pedido demorado |
| `Error` | `#EF4444` | Fallo de pago, stock agotado, error de validación |
| `Información` | `#3B82F6` | Notificaciones del sistema, ayuda en pantalla |
| `Offline` | `#6B7280` | Indicador de desconexión / almacenamiento local |

#### Superficie y Fondos (Modo Claro & Modo Oscuro)
| Token | Modo Claro (HEX) | Modo Oscuro (HEX) | Uso |
| :--- | :--- | :--- | :--- |
| `Background` | `#F8FAFC` | `#020617` | Fondo principal de la aplicación |
| `Surface` | `#FFFFFF` | `#0F172A` | Tarjetas, diálogos, contenedores principales |
| `Secondary Surface` | `#F1F5F9` | `#1E293B` | Inputs, sub-tarjetas, cabeceras de tabla |

#### Tipografía y Textos
| Token | Modo Claro (HEX) | Modo Oscuro (HEX) | Uso |
| :--- | :--- | :--- | :--- |
| `Primary` | `#0F172A` | `#F8FAFC` | Títulos principales y texto de alta relevancia |
| `Secondary` | `#475569` | `#94A3B8` | Subtítulos, labels y descripciones |
| `Hint` | `#94A3B8` | `#64748B` | Placeholders e iconos secundarios |
| `Disabled` | `#CBD5E1` | `#334155` | Estados inactivos y bordes deshabilitados |

---

### 🔤 Sistema Tipográfico

* **Fuente Oficial:** `Poppins` (Google Fonts)
* **Jerarquía de Tamaños:**

| Nivel | Tamaño | Peso | Aplicación |
| :--- | :--- | :--- | :--- |
| `Display XL` | 36 sp/px | Bold | Totales de ingresos, métricas principales |
| `Display` | 32 sp/px | SemiBold | Títulos de Dashboard principal |
| `H1` | 28 sp/px | SemiBold | Cabeceras de pantalla/módulo |
| `H2` | 24 sp/px | SemiBold | Títulos de sección principal |
| `H3` | 20 sp/px | Medium | Títulos de tarjetas y modales |
| `Title` | 18 sp/px | Medium | Subtítulos de sección |
| `Body` | 16 sp/px | Regular | Texto de lectura principal, inputs |
| `Small` | 14 sp/px | Regular | Listados, detalles secundarias |
| `Caption` | 12 sp/px | Regular | Timestamps, metadatos, badges pequeños |
| `Button` | 15 sp/px | SemiBold | Botones principales y secundarios |

---

### 📏 Sistema de Espaciado (Base 4dp/px)

Queda estrictamente prohibido el uso de valores arbitrarios. Todos los márgenes y paddings deben ajustarse a la escala oficial:
`4` · `8` · `12` · `16` · `20` · `24` · `32` · `40` · `48` dp/px.

---

### 🔳 Radios de Borde (Border Radius)

| Nivel | Valor | Aplicación |
| :--- | :--- | :--- |
| `Small` | 8 dp | Chips, badges, tooltips |
| `Medium` | 12 dp | Inputs secundarios, pequeños contenedores |
| `Card` | 18 dp | Tarjetas de contenido estándar |
| `Bottom Sheet` | 24 dp | Hoja inferior de opciones y filtros |
| `Dialog` | 24 dp | Diálogos de confirmación y modales centrado |
| `Floating Card` | 28 dp | Contenedores flotantes y menús desplegables principales |
| `Button / Input` | 16 dp | Botones estándar y barras de búsqueda |

---

### 🌑 Elevation & Sombras

Se limitan estrictamente a tres niveles para evitar sobrecarga visual:
* **Low (2dp):** Tarjetas en reposo, inputs enfocados.
* **Medium (6dp):** Tarjetas en hover, barras de navegación elevadas.
* **High (12dp):** Modales, diálogos y Bottom Sheets flotantes.

---

### 🎨 Iconografía
* **Familia:** `Material Symbols Rounded`.
* Estilo unificado en todo el sistema: sin mezclar con fuentes cuadradas o de líneas discontinuas. Peso y grosor visual uniforme.

---

## 5. Especificación de Componentes BSDS Core (23 Componentes)

Toda la biblioteca debe implementarse de forma isomórfica para Android Compose (`com.example.eiam.presentation.ui.bsds`) y Web React (`src/components/bsds`):

1. **`BSButton`**: Primario (Azul lleno, 56dp altura, 16dp radio), Secundario (Outlined), Terciario (Texto), Danger (Rojo), Success (Verde), FAB (Circular 64dp).
2. **`BSCard`**: Padding 20dp, Radio 20dp/18dp, Elevación 4dp, estructura interna consistente (Título + Icono + Contenido + Acción).
3. **`BSKpiCard`**: Icono temático, número principal (Display XL), variación/descripción, indicador de tendencia con color y animación.
4. **`BSAlertCard`**: Contenedor de advertencia/error/info con borde acentuado, icono de estado y acción directa.
5. **`BSSearchBar`**: Altura 56dp, icono de lupa a la izquierda, placeholder claro, filtro a la derecha y escáner QR opcional.
6. **`BSInput`**: Outlined Material, radio 16dp, soporte para icono izquierdo/derecho, mensajes de validación (Focus, Error, Success, Disabled).
7. **`BSBadge`**: Etiquetas de estado compactas redondeadas (`Nuevo` - Azul, `Premium` - Dorado, `VIP` - Morado, `Oferta` - Rojo, `En línea` - Verde).
8. **`BSChip`**: Filtros interactivos de categoría y estado con bordes redondeados completos (Pill Shape).
9. **`BSTopBar`**: Cabecera unificada con título de módulo, indicador de conectividad (Online/Offline) y perfil de usuario.
10. **`BSBottomNavigation`**: Navegación principal fija con 7 módulos clave: `Dashboard`, `Pedidos`, `Productos`, `Menú`, `Promos`, `Analytics`, `Más`.
11. **`BSMetricCard`**: Medidores gráficos de rendimiento comercial y operativo.
12. **`BSFinancialCard`**: Visualización de balances, cuentas por cobrar y comisiones con alta legibilidad.
13. **`BSOrderCard`**: Tarjeta de pedido en tiempo real con SLA timer, avatar de cliente y selector rápido de estado.
14. **`BSDriverCard`**: Estado de repartidor en ruta, batería, GPS y asignación de pedido.
15. **`BSProductCard`**: Vista de catálogo con imagen, badge de stock, toggle de disponibilidad y control de precio.
16. **`BSEmptyState`**: Estado sin datos obligatorio con ilustración vectorial, título, descripción explicativa y botón de acción principal.
17. **`BSLoadingSkeleton`**: Animación de carga tipo Skeleton pulso en lugar de spinners infinitos.
18. **`BSProgressCard`**: Progreso de metas comerciales o preparación de pedidos con barra de avance animada.
19. **`BSAIInsightCard`**: Tarjeta de recomendación inteligente impulsada por BlueSystem AI con acento Indigo y sugerencia accionable.
20. **`BSSectionHeader`**: Encabezado de sección estandarizado con título H2/H3 y acción "Ver todos".
21. **`BSFloatingActionButton`**: Botón flotante circular 64dp con animación de escala al presionar.
22. **`BSDialog`**: Diálogo centrado con radio 24dp, backdrop blur y confirmación atómica.
23. **`BSBottomSheet`**: Panel deslizable inferior con radio 24dp para filtros y acciones contextuales.

---

## 6. Patrón Estándar de Dashboard y Menú Desplegable (Hamburguesa)

Todas las pantallas de nivel principal seguirán la siguiente jerarquía vertical estricta:

```
Header (TopBar)
  ↓
Search (SearchBar)
  ↓
Estado (Conexión / Turno)
  ↓
KPIs (Grid BSKpiCard)
  ↓
Resumen (Métricas principales)
  ↓
Alertas (BSAlertCard / SLA)
  ↓
Actividad (Listado en vivo)
  ↓
Acciones Rápidas (Chips / Accesos)
  ↓
IA Insights (BSAIInsightCard)
```

### Regla del Menú Desplegable (Hamburguesa & Acordeón)
Para mantener la pantalla limpia y cumplir con la estética *Enterprise Minimalism*:
* Las opciones secundarias y herramientas avanzadas de cada módulo deben agruparse dentro de un **menú estilo hamburguesa / acordeón**.
* Al hacer clic en un encabezado del menú, el bloque se **expande o contrae** con una transición fluida (200–300 ms, easing estándar), permitiendo acceder a sub-rutas sin saturar la vista principal.

---

## 7. Reglas de Gobernanza del Design System (ADR-005)

1. **Inmutabilidad Visual sin ADR:** Ninguna pantalla nueva o existente podrá diseñarse fuera de los tokens y componentes definidos en BSDS v1.0.
2. **Uso Obligatorio de Componentes BS:** Queda prohibido construir elementos de interfaz "ad-hoc" (como botones crudos `<button>` o `Button()` Compose sin envoltorio BSDS) si ya existe su equivalente oficial en la biblioteca.
3. **Control de Cambios Visuales:** Cualquier evolución o adición de tokens o nuevos componentes requerirá una propuesta formal y aprobación de arquitectura mediante una revisión de este ADR.
4. **Modo Oscuro Obligatorio:** Todos los componentes de la biblioteca deben contar con soporte nativo de Modo Claro y Modo Oscuro probado en contraste AA.
5. **Prioridad de Activo Arquitectónico:** El sistema de diseño es un activo arquitectónico de igual jerarquía que los motores de backend, Firestore y la sincronización offline.

---

## 8. Consecuencia y Cumplimiento

La adopción de este ADR garantiza que BlueSystem Delivery mantenga un estándar visual idéntico al de las mejores plataformas comerciales globales (Stripe, Uber Eats Merchant, DoorDash Merchant), asegurando la satisfacción de comerciantes, repartidores y administradores.
