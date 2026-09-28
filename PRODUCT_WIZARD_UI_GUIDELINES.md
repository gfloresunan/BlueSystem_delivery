# PRODUCT WIZARD UI & UX GUIDELINES
**BlueSystem Delivery Enterprise v2.1**

---

## 1. Principios de Diseño Visual

- **Paleta de Colores Curada**:
  - Azul Primario Enterprise: `#2563EB`
  - Azul Secundario: `#3B82F6`
  - Fondo de Contenedor: `#F8FAFC`
  - Superficie Card: `#FFFFFF`
  - Verdes de Confirmación: `#10B981`
  - Rojos de Alerta / Error: `#EF4444` / `#DC2626`
- **Tipografía y Jerarquía**:
  - Títulos de Pasos: `FontWeight.ExtraBold`, `17.sp`
  - Encabezados de Sección: `FontWeight.Bold`, `15.sp` / `16.sp`
  - Labels de Inputs: `FontWeight.Medium`, `12.sp` / `13.sp`
- **Espaciados y Esquinas**:
  - Diálogo Modal: Esquinas redondeadas `24.dp` con sombra `16.dp`.
  - Tarjetas de Pasos: Esquinas redondeadas `16.dp` con bordes `1.dp` en `#E2E8F0`.

---

## 2. Responsividad Multi-Dispositivo

- **BoxWithConstraints**:
  - `Smartphones`: Ancho relativo `95%` de pantalla, padding vertical `10.dp`.
  - `Tablets & Galaxy Z Fold`: Ancho fijo máximo `680.dp`, padding vertical `20.dp`.
