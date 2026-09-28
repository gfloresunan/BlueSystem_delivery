# BLUE SYSTEM DELIVERY ENTERPRISE
## FASE 1 — PLAN DE EVOLUCIÓN Y CONTEXTO JERÁRQUICO EN ANDROID

**PROYECTO:** BlueSystem Delivery Enterprise  
**MODO:** READ-ONLY FORENSIC PLANNING — ZERO MODIFICATION  

---

### 1. EVOLUCIÓN DEL ARQUITECTURA DE CONTEXTO EN ANDROID

Actualmente la app Android opera únicamente bajo un `BusinessContext`. Para soportar la jerarquía canónica sin introducir regresiones ni alterar la experiencia de usuario, se planifica la arquitectura de triples contextos:

```text
                        ┌────────────────────────┐
                        │   OrganizationContext  │
                        │   (Holding / Franchise)│
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │    BusinessContext     │
                        │   (Brand / Comercio)   │
                        └───────────┬────────────┘
                                    │
                        ┌───────────▼────────────┐
                        │     BranchContext      │
                        │ (Sucursal / Delivery)  │
                        └────────────────────────┘
```

---

### 2. PLAN DE EVOLUCIÓN MÓDULO POR MÓDULO

1. **Modelos de Dominio (`com.example.domain.model`):**
   - Actualizar `Order.kt` para incorporar opcionalmente `val orgId: String? = null` y `val branchId: String? = null`.
   - Actualizar `Product.kt` para incorporar opcionalmente `val orgId: String? = null`.
   - Preservar valores por defecto nulos para asegurar retrocompatibilidad 100% con desensamblado de JSONs históricos.

2. **Capa de Persistencia y Repositorios:**
   - `BusinessRepository.kt`: Incorporar método `getOrganization(orgId: String)` aprovechando las clases EIAM ya existentes ([Organization.kt](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/eiam/domain/model/Organization.kt)).
   - `OrderRepository.kt`: Incluir `orgId` y `branchId` en el payload de creación de orden al enviar a Firestore.

3. **Interfaz de Usuario (Jetpack Compose):**
   - Para el usuario Cliente / Comensal: Mantiene la navegación fluida basada en Comercios. La selección de sucursal se autoresuelve por proximidad GPS (`LocationProcessor.kt`) asociando la `Branch` primaria más cercana.
   - Para el Merchant Admin: Añadir selector opcional de Sucursal (`BranchSelector`) en la barra superior del Dashboard para filtrar analíticas y KDS por punto de venta.
