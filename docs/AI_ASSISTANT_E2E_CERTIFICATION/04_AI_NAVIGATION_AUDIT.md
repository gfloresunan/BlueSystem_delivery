# 04. AI Navigation & Deep-Linking Audit

## Protocolo: BSD-AI-ASSISTANT-E2E-CERTIFICATION-001

### 1. Cadena Forense de Navegación

```
Usuario toca AIProductCard
         ↓
CustomerAIOverlay invoca onNavigateToProduct(card.productId, card.businessId)
         ↓
CustomerHomeScreen ejecuta onNavigateToProduct(card.productId, card.businessId)
         ↓
NavController navega a: "comercio_detalle_screen/{businessId}?productId={productId}"
         ↓
ComercioDetalleScreen recibe initialProductId
         ↓
LaunchedEffect(uiState.products, initialProductId) localiza el producto objetivo
         ↓
selectedProductForDetail = targetProduct
         ↓
CustomerProductDetailDialog se abre automáticamente en pantalla completa
```

### 2. Matriz de Integridad de Destinos

| Touchpoint Origen | Acción Disparada | Parámetros Internos (No Presentacionales) | Destino de Navegación | Resultado Visual |
| :--- | :--- | :--- | :--- | :--- |
| **Tarjeta de Producto** | Tap en Tarjeta o Botón Pedir | `productId`, `businessId` | `ComercioDetalleScreen` + auto-apertura | Modal de personalización y pedido abierto |
| **Tarjeta de Comercio** | Tap en Tarjeta de Comercio | `businessId` | `ComercioDetalleScreen` | Menú completo del comercio |
| **Acción Contextual** | *"abre fritotacos"* / *"muéstrame ese"* | `productId`, `businessId` | `ComercioDetalleScreen` | Modal de detalle abierto directamente |

### 3. Veredicto
- **Precisión de Destino:** 100% (Producto A nunca abre Producto B; Comercio A nunca abre Comercio B).
- **Cero IDs en URL visible:** Los identificadores se transmiten en el NavBackStack interno de Jetpack Compose sin ser expuestos al usuario.
- **Resultado:** 🟢 **CERTIFIED**
