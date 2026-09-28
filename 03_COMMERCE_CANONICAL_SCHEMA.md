# 03_COMMERCE_CANONICAL_SCHEMA.md
## Esquema Canónico de Datos del Comercio (SSOT) — BlueSystem Enterprise
**Protocolo:** BSD-COMMERCE-IDENTITY-GEO-FEATURED-CONSISTENCY-001  
**Fecha:** 28 de Agosto, 2026  
**Colección Principal:** `/businesses/{businessId}`  
**Colecciones Relacionadas:** `/branches/{branchId}`, `/orders/{orderId}`, `/users/{userId}` (Legacy Sync)  

---

### 1. Definición del Esquema Canónico `/businesses/{businessId}`

```typescript
interface CanonicalBusinessDocument {
  // Identificadores y Nombres Canónicos
  businessId: string;                 // ID único canónico (ej: "biz_1724888000" o Auth UID)
  id: string;                         // Espejo de businessId para compatibilidad
  name: string;                       // Nombre comercial (ej: "Pizzería Don Corleone")
  comercioNombre: string;             // Espejo canónico en español
  nombre: string;                     // Espejo de compatibilidad

  // Contacto & Comunicación
  email: string;                      // Correo oficial del comercio
  phone: string;                      // Teléfono oficial (ej: "+505 8888-9999")
  telefono: string;                   // Espejo en español

  // Contrato Territorial y Geolocalización Canónica (SSOT)
  departmentId: string;               // ID oficial en mayúsculas (ej: "MANAGUA", "MASAYA", "LEON")
  departmentName: string;             // Nombre legible oficial (ej: "Managua", "Masaya", "León")
  department: string;                 // Compatibilidad
  departamento: string;               // Compatibilidad
  municipalityId: string;             // ID oficial en mayúsculas (ej: "MANAGUA", "NINDIRI", "CIUDAD_DARIO")
  municipalityName: string;           // Nombre legible oficial (ej: "Managua", "Nindirí", "Ciudad Darío")
  municipality: string;               // Compatibilidad
  municipio: string;                  // Compatibilidad
  cityId: string;                     // Compatibilidad (espejo de municipalityId)
  city: string;                       // Compatibilidad (espejo de municipalityName)
  ciudad: string;                     // Compatibilidad

  // Dirección Física y Cartografía
  address: string;                    // Dirección descriptiva nicaragüense (ej: "De la Rotonda El Guegüense 2c abajo")
  direccion: string;                  // Espejo en español
  formattedAddress: string;           // Dirección normalizada
  zone?: string;                      // Zona o barrio comercial (ej: "Villa Fontana", "Plano Central")
  latitude: number;                   // Coordenada latitud WGS84 (ej: 12.136389)
  longitude: number;                  // Coordenada longitud WGS84 (ej: -86.251389)
  lat: number;                        // Espejo numérico
  lng: number;                        // Espejo numérico
  location: {                         // Objeto GeoPoint o JSON WGS84
    latitude: number;
    longitude: number;
  } | null;
  googleMapsUrl: string;              // URL de apertura directa (ej: "https://www.google.com/maps/search/?api=1&query=12.136389,-86.251389")
  placeId: string;                    // ID de lugar de Google Maps si fue seleccionado vía Places

  // Catálogo y Clasificación
  category: string;                   // "Restaurante" | "Supermercado" | "Farmacia" | "Cafetería" | "Otro"
  categoria: string;                  // Espejo
  description: string;                // Descripción comercial / eslogan
  descripcion: string;                // Espejo

  // Logística y Operación
  deliveryFee: number;                // Tarifa base en Córdobas (ej: 35.0)
  costoEnvioBase: number;             // Espejo en Córdobas
  avgPrepTimeMinutes: number;         // Tiempo de preparación promedio en minutos (ej: 15)
  tiempoEstimadoMinutos: number;      // Espejo
  isOpen: boolean;                    // true = Abierto en vivo para recibir pedidos
  abierto: boolean;                   // Espejo
  active: boolean;                    // true = Cuenta activa
  isActive: boolean;                  // Espejo
  status: "ACTIVE" | "INACTIVE";      // Estado operativo
  lifecycleStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DEPROVISIONED";

  // Marketplace & Home Carousel (SSOT)
  isFeatured: boolean;                // AUTORIDAD ÚNICA: true = Aparece en carrusel de Comercios Destacados
  featured: boolean;                  // Espejo booleano exacto
  destacado: boolean;                 // Espejo booleano exacto

  // Contexto Organizacional y Multitenancy (EIAM v2.1 / v3)
  orgId: string | null;               // ID del Holding / Organización
  tenantId: string | null;            // ID del Tenant comercial
  brandId: string | null;             // ID de la Marca

  // Auditoría y Reputación
  rating: number;                     // 1.0 - 5.0
  averageRating: number;              // 1.0 - 5.0
  ratingCount: number;                // Conteo de calificaciones
  createdAt?: any;                    // Timestamp Firestore
  updatedAt: any;                     // Timestamp Firestore
}
```

---

### 2. Contrato de Estampado en Pedidos `/orders/{orderId}` (Server-Authoritative)

Al crearse un pedido de tipo `COMMERCE_DELIVERY`, la Cloud Function `notifyNewOrder` estampa los siguientes atributos autoritativos copiados desde `/businesses/{businessId}`:

| Campo en `/orders/{orderId}` | Tipo | Origen Canónico | Propósito |
| :--- | :--- | :--- | :--- |
| `businessDepartmentId` | string | `bizData.departmentId` | Filtro departamental |
| `businessDepartment` | string | `bizData.departmentName` | Visualización en App/Dashboard |
| `businessMunicipalityId` | string | `bizData.municipalityId` | **Criterio de Elegibilidad de Flota** |
| `businessMunicipality` | string | `bizData.municipalityName` | Visualización en App/Dashboard |
| `departmentId` | string | `bizData.departmentId` | Consulta de despacho |
| `municipalityId` | string | `bizData.municipalityId` | Segmentación del Fleet Pool |
| `cityId` | string | `bizData.municipalityId` | Compatibilidad Courier App |
| `city` | string | `bizData.municipalityName` | Compatibilidad Courier App |
| `businessLatitude` | number | `bizData.latitude` | Cálculo de distancia y ruteo |
| `businessLongitude` | number | `bizData.longitude` | Cálculo de distancia y ruteo |
| `tenantId` | string | `bizData.tenantId` | Aislamiento Multi-Tenant EIAM |
