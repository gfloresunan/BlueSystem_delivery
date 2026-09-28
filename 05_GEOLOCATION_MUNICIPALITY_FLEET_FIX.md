# 05_GEOLOCATION_MUNICIPALITY_FLEET_FIX.md
## Corrección y Blindaje: Geolocalización, Catálogo Canónico y Elegibilidad de Flota por Municipio
**Protocolo:** BSD-COMMERCE-IDENTITY-GEO-FEATURED-CONSISTENCY-001  
**Fecha:** 28 de Agosto, 2026  
**Ambiente:** Enterprise Live  

---

### 1. Diagnóstico de la Falencia Territorial y de Flota
1. **Edición en Admin Web:** El formulario carecía de dropdowns controlados de Departamento y Municipio, impidiendo al administrador asignar correctamente la ubicación física de un comercio.
2. **Ausencia de Selector en Mapa (Map Picker):** No existía una herramienta cartográfica interactiva en el modal de comercios para capturar coordenadas WGS84 (`latitude`, `longitude`) ni reverse geocoding.
3. **Elegibilidad de Flota (`FleetEligibilityEngine`):** Para pedidos comerciales (`COMMERCE_DELIVERY`), el motor exige coincidencia estricta de municipio:
   $$\text{courier.municipality} == \text{order.municipality}$$
   Si el comercio no tenía `municipalityId` guardado en Firestore, la orden no se segmentaba correctamente en el Fleet Pool.

---

### 2. Implementación de la Solución

#### A. Catálogo Canónico Geográfico SSOT (`panel-admin/public/js/utils/geoCatalog.js`)
- Incorporación de los 17 departamentos y municipios oficiales de Nicaragua.
- Funciones de validación e interpolación: `isValidMunicipality(deptId, muniId)`, `getDepartmentName()`, `getMunicipalityName()`, `normalizeGeoLocation()`.
- Carga oficial en `dashboard.html` antes de los módulos de operaciones.

#### B. Componente UI & Selector Cartográfico Interactivo (`liveRestaurants.js`)
- **Selects en Cascada Controlados:** Al seleccionar un Departamento, el selector de Municipios se actualiza automáticamente con los municipios oficiales de ese departamento.
- **Selector de Ubicación en Mapa (Leaflet Map Picker Modal):**
  - Pin movible (drag & drop) que actualiza `latitude` y `longitude` en tiempo real.
  - Buscador de direcciones y puntos de referencia en Nicaragua conectado a OpenStreetMap Nominatim.
  - Botón de detección GPS mediante `navigator.geolocation.getCurrentPosition`.
  - Botón de apertura y previsualización directa en Google Maps (`https://www.google.com/maps/search/?api=1&query=lat,lng`).

#### C. Estampado Server-Authoritative en `/orders` (`functions/src/triggers/orders.ts`)
En el trigger `notifyNewOrder`, al crearse una orden `COMMERCE_DELIVERY`, se consulta server-side `/businesses/{order.businessId}` y se estampan los metadatos inmutables:
- `businessDepartmentId`, `businessDepartment`
- `businessMunicipalityId`, `businessMunicipality`
- `departmentId`, `departmentName`
- `municipalityId`, `municipalityName`
- `cityId`, `city`
- `businessLatitude`, `businessLongitude`
- `tenantId`

#### D. Segmentación y Validación en Flota (`FleetEligibilityEngine.kt` y `FirebaseManager.kt`)
- `FleetEligibilityEngine.kt` valida:
  ```kotlin
  val courierMuni = courier.municipalityId.ifBlank { courier.cityId.ifBlank { courier.city } }.trim().uppercase()
  val branchMuni = branch.municipalityId.ifBlank { branch.cityId.ifBlank { branch.city } }.trim().uppercase()
  if (courierMuni.isNotBlank() && branchMuni.isNotBlank() && courierMuni != branchMuni) {
      return EligibilityResult(false, "El repartidor pertenece a $courierMuni y la sucursal a $branchMuni")
  }
  ```
- `FirebaseManager.kt` (`obtenerFlujoPedidosCourier`) filtra los pedidos del pool para que únicamente los couriers del mismo municipio operacional (`courierEffectiveMuni == orderEffectiveMuni`) reciban y puedan reclamar pedidos comerciales.

---

### 3. Matriz de Cobertura Geográfica de Nicaragua (17 Departamentos)

| Departamento | ID Canónico | Municipios Oficiales Soportados |
| :--- | :--- | :--- |
| **Boaco** | `BOACO` | Boaco, Camoapa, San José de los Remates, San Lorenzo, Santa Lucía, Teustepe |
| **Carazo** | `CARAZO` | Diriamba, Dolores, El Rosario, Jinotepe, La Conquista, La Paz de Carazo, San Marcos, Santa Teresa |
| **Chinandega** | `CHINANDEGA` | Chichigalpa, Chinandega, Cinco Pinos, Corinto, El Realejo, El Viejo, Posoltega, Puerto Morazán, San Francisco del Norte, San Pedro del Norte, Santo Tomás del Norte, Somotillo, Villanueva |
| **Chontales** | `CHONTALES` | Acoyapa, Comalapa, San Francisco de Cuapa, El Coral, Juigalpa, La Libertad, San Pedro de Lóvago, Santo Domingo, Santo Tomás, Villa Sandino |
| **Estelí** | `ESTELI` | Condega, Estelí, La Trinidad, Pueblo Nuevo, San Juan de Limay, San Nicolás |
| **Granada** | `GRANADA` | Diriá, Diriomo, Granada, Nandaime |
| **Jinotega** | `JINOTEGA` | El Cuá, Jinotega, La Concordia, San José de Bocay, San Rafael del Norte, San Sebastián de Yalí, Santa María de Pantasma, Wiwilí de Jinotega |
| **León** | `LEON` | Achuapa, El Jicaral, El Sauce, La Paz Centro, Larreynaga (Malpaisillo), León, Nagarote, Quezalguaque, Santa Rosa del Peñón, Telica |
| **Madriz** | `MADRIZ` | Las Sabanas, Palacagüina, San José de Cusmapa, San Juan de Río Coco, San Lucas, Somoto, Telpaneca, Totogalpa, Yalagüina |
| **Managua** | `MANAGUA` | Ciudad Sandino, El Crucero, Managua, Mateare, San Francisco Libre, San Rafael del Sur, Ticuantepe, Tipitapa, Villa El Carmen |
| **Masaya** | `MASAYA` | Catarina, La Concepción, Masatepe, Masaya, Nandasmo, Nindirí, Niquinohomo, San Juan de Oriente, Tisma |
| **Matagalpa** | `MATAGALPA` | Ciudad Darío, Esquipulas, Matagalpa, Matiguás, Muy Muy, Rancho Grande, Río Blanco, San Dionisio, San Isidro, San Ramón, Sébaco, Terrabona, Waslala |
| **Nueva Segovia** | `NUEVA_SEGOVIA` | Ciudad Antigua, Dipilto, El Jícaro, Gualán, Jalapa, Macuelizo, Mozonte, Murra, Ocotal, Quilalí, San Fernando, Santa María, Wiwilí de Nueva Segovia |
| **Río San Juan** | `RIO_SAN_JUAN` | El Almendro, El Castillo, Morrito, San Carlos, San Juan de Nicaragua, San Miguelito |
| **Rivas** | `RIVAS` | Altagracia, Belén, Buenos Aires, Cárdenas, Moyogalpa, Potosí, Rivas, San Jorge, San Juan del Sur, Tola |
| **Costa Caribe Norte** | `RACCN` | Bonanza, Prinzapolka, Puerto Cabezas (Bilwi), Rosita, Siuna, Waspán, Mulukukú, Bocas de Paiwas |
| **Costa Caribe Sur** | `RACCS` | Bluefields, Corn Island, Desembocadura de Río Grande, El Ayote, El Rama, El Tortuguero, Kukra Hill, La Cruz de Río Grande, Laguna de Perlas, Muelle de los Bueyes, Nueva Guinea |
