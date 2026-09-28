# MER 18.2 — Contrato de Datos Firestore (Firestore Data Contract)
**Auditoría Física E2E Integral — Módulo Comercio BlueSystem Delivery Enterprise**  
*Fecha: 14 de Septiembre de 2026*  
*Auditor: Senior Developer & Auditor Forense de BlueSystem*

---

## Esquema Canónico de Colecciones del Módulo Comercio

A continuación se auditan los esquemas de datos exactos que sustentan la persistencia del comercio en Cloud Firestore, incluyendo tipos de datos, nulabilidad, colecciones de origen y reglas de consistencia técnica.

---

### 1. Colección `/businesses/{businessId}`

Es la entidad principal del comercio dentro de la plataforma.

```typescript
interface BusinessDocument {
  id: string;                          // UID único del comercio (igual al Auth UID)
  name: string;                        // Nombre comercial del negocio
  legalName?: string;                  // Razón social fiscal
  taxId?: string;                      // Identificador fiscal / RFC / NIT
  address: string;                     // Dirección física
  latitude: number;                    // Coordenada geográfica Latitud
  longitude: number;                   // Coordenada geográfica Longitud
  phone: string;                       // Teléfono de contacto comercial
  email: string;                       // Correo del comercio
  category: string;                    // Rubro: "Restaurante", "Farmacia", "Supermercado", etc.
  tags: string[];                      // Etiquetas de búsqueda: ["hamburguesas", "comida rápida"]
  
  // Identidad Gráfica y Assets
  logoUrl?: string;                    // URL canónica del logotipo
  photoUrl?: string;                   // Fallback de logotipo
  optimizedLogoUrl?: string;           // Versión comprimida para carga ultrarrápida
  bannerUrl?: string;                  // Portada principal
  coverUrl?: string;                   // Fallback portada
  optimizedBannerUrl?: string;         // Portada comprimida
  
  // Estado Operativo en Vivo
  isOpen: boolean;                     // Switch de apertura en vivo (SSOT #1)
  isSuspended?: boolean;               // Suspensión administrativa por mora o penalización
  isActive: boolean;                   // Estado general de alta en la plataforma
  rating?: number;                     // Calificación promedio (0.0 - 5.0)
  totalRatings?: number;               // Cantidad total de calificaciones
  
  // Parámetros de Operación Rápida
  averagePreparationMinutes: number;   // Tiempo base de cocina (ej. 25)
  deliveryRadiusKm: number;            // Radio de cobertura en kilómetros (ej. 8.0)
  autoAcceptOrders: boolean;           // Si acepta órdenes sin confirmación manual
  
  // Metadatos
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 2. Colección `/restaurant_settings/{businessId}`

Almacena la configuración extendida y los horarios detallados de atención por día de la semana.

```typescript
interface RestaurantSettingsDocument {
  businessId: string;                  // ID del comercio
  isOpenOverride: boolean;             // Forzado manual de apertura/cierre
  autoAcceptOrders: boolean;           // Confirmación automática de pedidos
  estimatedPrepTimeMinutes: number;    // Tiempo promedio de preparación
  deliveryRadiusMeters: number;        // Radio en metros (ej. 8000)
  
  // Matriz Horaria Semanal
  schedule: {
    [day in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
      enabled: boolean;                // Si abre este día específico
      openTime: string;                // Formato "HH:mm" (ej. "09:00")
      closeTime: string;               // Formato "HH:mm" (ej. "22:00")
    }
  };
  
  // Notificaciones y Alertas Sonoras
  soundAlertsEnabled: boolean;         // Alerta acústica para nuevos pedidos
  printerAutoPrint: boolean;           // Impresión automática de comandas
  
  updatedAt: Timestamp;
}
```

---

### 3. Colección `/categories/{categoryId}`

Define la segmentación de la carta o catálogo de productos del negocio.

```typescript
interface CategoryDocument {
  id: string;                          // Identificador generado por Firestore
  businessId: string;                  // ID del comercio dueño
  name: string;                        // Nombre de la categoría (ej. "Bebidas", "Pizzas")
  order: number;                       // Entero de ordenamiento visual (0, 1, 2, ...)
  isActive: boolean;                   // Si está visible en el menú público
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 4. Colección `/products/{productId}`

Representa cada ítem individual que el comercio ofrece para venta directa.

```typescript
interface ProductDocument {
  id: string;                          // ID único del producto
  businessId: string;                  // ID del comercio
  categoryId: string;                  // ID de la categoría a la que pertenece
  name: string;                        // Nombre del producto
  description: string;                 // Descripción comercial o ingredientes
  price: number;                       // Precio unitario base en moneda local
  costPrice?: number;                  // Costo interno para cálculo de margen
  imageUrl?: string;                   // URL en Firebase Storage
  isAvailable: boolean;                // Stock / Disponibilidad en vivo
  trackStock: boolean;                 // Si descuenta unidades de inventario
  stockQuantity?: number;              // Stock actual disponible si trackStock es true
  
  // Grupos de Opciones y Modificadores
  optionGroups?: Array<{
    id: string;
    name: string;                      // Ej: "Elige tu término", "Salsas extras"
    minSelections: number;             // 0 si es opcional, 1 si es obligatorio
    maxSelections: number;             // Máximo de opciones seleccionables
    options: Array<{
      id: string;
      name: string;                    // Ej: "Bien cocido", "Salsa BBQ"
      additionalPrice: number;         // Sobreprecio (0 si no añade costo)
      isAvailable: boolean;
    }>;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 5. Colección `/combos/{comboId}`

Permite agrupar productos a un precio preferencial.

```typescript
interface ComboDocument {
  id: string;                          // ID del combo
  businessId: string;                  // ID del comercio
  title: string;                       // Título del combo (ej: "Combo Familiar")
  description: string;                 // Detalle de lo que incluye
  comboPrice: number;                  // Precio final con descuento aplicado
  originalPrice: number;               // Sumatoria de precios individuales
  isActive: boolean;                   // Si está activo
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  createdAt: Timestamp;
}
```
> *Nota de Auditoría:* En la app cliente no se lee esta colección (`GAP-005`).

---

### 6. Colección `/promotions/{promotionId}`

Contiene las campañas de descuento, cupones y ofertas especiales.

```typescript
interface PromotionDocument {
  id: string;
  businessId?: string;                 // ID del comercio si es promo local (o null si es de plataforma)
  title: string;                       // Título promocional
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY' | 'TWO_FOR_ONE';
  discountValue: number;               // Valor del descuento (ej: 20 para 20% o 50 para $50)
  minimumOrderAmount: number;          // Monto mínimo de compra aplicable
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  couponCode?: string;                 // Código opcional de cupón
  createdAt: Timestamp;
}
```
> *Nota de Auditoría:* El módulo de promociones en la APK Android no tiene interfaz accesible (`GAP-001`).

---

### 7. Colección `/orders/{orderId}`

Documento transaccional de órdenes de delivery del comercio.

```typescript
interface OrderDocument {
  id: string;
  orderNumber?: string;                // Folio corto legible (ej. #1042)
  customerId: string;                  // UID del cliente comprador
  customerName: string;                // Nombre del cliente
  customerPhone: string;               // Teléfono de contacto
  businessId: string;                  // UID del comercio
  businessName: string;                // Nombre del negocio
  
  // Estado del Ciclo de Vida
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  cancellationReason?: string;
  
  // Desglose Monetario
  subtotal: number;                    // Subtotal de productos
  deliveryFee: number;                 // Tarifa de envío
  platformFee?: number;                // Comisión de servicio de app
  discountAmount?: number;             // Descuento aplicado
  total: number;                       // Total cobrado al cliente
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'BALANCE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  
  // Items de la Orden
  items: Array<{
    productId: string;
    productName: string;
    price: number;
    quantity: number;
    subtotal: number;
    imageUrl?: string;
    selectedOptions?: any[];           // Omitido en app cliente (GAP-006)
  }>;
  
  // Coordenadas y Entrega
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  assignedCourierId?: string;          // UID canónico del repartidor asignado
  courierName?: string;
  
  // Tiempos Operativos
  estimatedPreparationMinutes?: number;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  preparingAt?: Timestamp;
  readyAt?: Timestamp;
  deliveredAt?: Timestamp;
}
```

---

### 8. Colección `/merchant_summaries/{businessId}`

Documento sintetizado de agregación de KPIs del comercio para lectura de bajo costo (ADR-003).

```typescript
interface MerchantSummaryDocument {
  businessId: string;
  todaySalesCents: number;             // Total vendido hoy en centavos enteros
  todayOrdersCount: number;            // Total de pedidos procesados hoy
  averageTicketCents: number;          // Ticket promedio en centavos
  openOrdersCount: number;             // Pedidos en curso en este momento
  pendingSettlementCents: number;      // Saldo pendiente de liquidar
  lastAggregatedAt: Timestamp;
}
```

---

### 9. Colección `/merchant_settlements/{settlementId}`

Registro oficial e inmutable de cortes financieros semanales o quincenales (ADR-019).

```typescript
interface MerchantSettlementDocument {
  id: string;                          // Identificador único del corte
  businessId: string;                  // ID del comercio
  businessName: string;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  
  // Cifras en Centavos Enteros
  grossSalesCents: number;             // Ventas brutas totales
  commissionRate: number;              // Porcentaje de comisión acordado (ej. 0.15 para 15%)
  commissionFeeCents: number;          // Monto retenido por la plataforma
  netPayoutCents: number;              // Saldo neto a transferir al comercio
  ordersCount: number;                 // Cantidad de pedidos incluidos
  
  // Estado y Disputas
  status: 'GENERATED' | 'PAYMENT_REGISTERED' | 'CONFIRMED' | 'DISPUTED' | 'PAID';
  isFrozen: boolean;                   // Inmutabilidad contable estricta
  disputeReason?: string;
  paymentReference?: string;           // Folio de transferencia bancaria
  paymentReceiptUrl?: string;          // Comprobante bancario en Storage
  
  // Auditoría
  history: Array<{
    actorUid: string;
    actorRole: string;
    status: string;
    timestamp: Timestamp;
    notes?: string;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Matriz de Coherencia de Tipos y Campos

| Colección | ¿Clave Primaria Canónica? | ¿Riesgo de Divergencia de Campos? | Integridad Referencial |
|---|---|---|---|
| `/businesses` | Sí (`UID` de Auth) | Sí: Duplicidad con `/restaurant_settings` en `isOpen` y `autoAccept` | Alta |
| `/restaurant_settings` | Sí (`UID` de Auth) | Sí: Requiere sincronización dual | Media (`GAP-010`) |
| `/categories` | Generada por Firestore | No | Alta (indexada por `businessId`) |
| `/products` | Generada por Firestore | No | Alta (indexada por `businessId` y `categoryId`) |
| `/combos` | Generada por Firestore | Sí: Cliente no implementa el schema | Baja en Cliente (`GAP-005`) |
| `/promotions` | Generada por Firestore | Sí: No operable en APK Android | Nula en Android (`GAP-001`) |
| `/orders` | Generada por Firestore | Sí: Items omiten modificadores (`GAP-006`) | Muy Alta |
| `/merchant_summaries` | Sí (`UID` del Comercio) | No: Gestionada por Cloud Functions | Óptima (ADR-003) |
| `/merchant_settlements` | Generada por Firestore | No: Regulada por ADR-019 Inmutable | Blindada (ADR-019) |
