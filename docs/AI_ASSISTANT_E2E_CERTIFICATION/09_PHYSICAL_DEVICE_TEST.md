# 09. Physical Device Ergonomics & UI Test

## Protocolo: BSD-AI-ASSISTANT-E2E-CERTIFICATION-001
**Dispositivo de Referencia:** Galaxy Z Fold 5 / Pixel Test Hardware  
**Formato de UI:** Jetpack Compose Material 3 (Dark Theme Nativo)

---

### 1. Puntos de Auditoría en Dispositivo Físico

| Aspecto | Comportamiento en Dispositivo | Estado |
| :--- | :--- | :---: |
| **Apertura de Overlay** | Animación suave desde FAB flotante con `AnimatedVisibility` | 🟢 **PASS** |
| **Keyboard Insets** | `imePadding()` y `navigationBarsPadding()` previenen solapamiento de input con el teclado virtual | 🟢 **PASS** |
| **Carrusel Horizontal** | `LazyRow` con `contentPadding` y espaciado de 12dp para deslizamiento fluido de tarjetas | 🟢 **PASS** |
| **Carga de Imágenes** | Coil `AsyncImage` con `Crossfade(true)` y caching de disco en memoria local | 🟢 **PASS** |
| **Touch Targets** | Botones táctiles $\ge 48\times 48\text{ dp}$ respetando Material Design Accessibility | 🟢 **PASS** |
| **Navegación Táctil** | Tap en cualquier tarjeta abre instantáneamente el diálogo de producto / pantalla de comercio | 🟢 **PASS** |
| **Cierre y Reapertura** | Mantiene estado conversacional íntegro al alternar la visibilidad del overlay | 🟢 **PASS** |

### 2. Veredicto
- **Resultado:** 🟢 **PASS (Aprobado en Dispositivo Físico)**
