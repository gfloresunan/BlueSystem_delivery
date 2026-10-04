# ADR-030: Dashboard Manager Enterprise 2.0 & Dynamic Content Order / Editorial Ads Core Freeze
## Baseline Inmutable v2.4 Enterprise — Administración Remota Dinámica del Home & Publicidad Editorial

**Estatus:** 🔒 **ACCEPTED & FROZEN**  
**Fecha:** 4 de Octubre de 2026  
**Área de Gobernanza:** Frontend Dinámico, CMS Remoto & Plataforma Publicitaria  
**Protocolo Base:** `BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001`  
**Superficie Afectada:** Admin Web (`🎨 Dashboard Manager`) ──> Firestore ──> Android Customer App (`CustomerHomeFeedSection`)  

---

## 1. Contexto y Cadena Completa de Certificación

El protocolo `BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001` ha concluido satisfactoriamente las cuatro fases de ingeniería, auditoría de recuperación y certificación, garantizando la gobernanza dinámica remota sobre el Customer Home sin requerir nuevos despliegues de la aplicación móvil:

```text
                  ADMIN WEB
          (🎨 Dashboard Manager v5.3.0)
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   /dashboard/configuration  /home_editorial_ads
   (sectionOrder, titles)    (campañas editoriales)
         │                         │
         └────────────┬────────────┘
                      ▼
             FIRESTORE REALTIME
             (onSnapshot / 60 FPS)
                      │
                      ▼
             CUSTOMER APP ANDROID
             (Compose + HorizontalPager)
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   REORDENAMIENTO EN VIVO    CARRUSEL EDITORIAL
   (Inmunidad a Fallbacks)   (Autoplay 5s / Touch Pause / Debounce 6s)
```

### Documentación Precedente Certificada:
- **Fase 0 (Auditoría Forense):** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-0_FORENSIC-AUDIT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-0_FORENSIC-AUDIT.md)
- **Fase 1 (Diseño Contractual):** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-1_CONTRACT-DESIGN.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-1_CONTRACT-DESIGN.md)
- **Fase 2 (Admin Web Implementation):** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-2_ADMIN-WEB-IMPLEMENTATION-REPORT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-2_ADMIN-WEB-IMPLEMENTATION-REPORT.md)
- **Fase 3 (Android Implementation):** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-3_ANDROID-IMPLEMENTATION-REPORT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-3_ANDROID-IMPLEMENTATION-REPORT.md)
- **Fase 4 (E2E Validation & Dispositivos):** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-4_PHYSICAL-E2E-VALIDATION-REPORT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_PHASE-4_PHYSICAL-E2E-VALIDATION-REPORT.md)
- **Auditoría Post-Apagado:** [`BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_POST-POWER-LOSS-RECOVERY-AUDIT.md`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/BSD-DASHBOARD-MANAGER-DYNAMIC-CONTENT-ORDER-ADS-001_POST-POWER-LOSS-RECOVERY-AUDIT.md)

---

## 2. Decisión Arquitectónica

Se declara formalmente el **CONGELAMIENTO ARQUITECTÓNICO INMUTABLE (FREEZE)** sobre el subsistema **Dashboard Manager Enterprise 2.0, Control Dinámico del Home y Publicidad Editorial**.

### Componentes Blindados Inmutables (Code is Source of Truth):

1. **Estructura Canónica de Datos en Firestore & Storage:**
   - **`/dashboard/configuration`**: Documento canónico que rige `sectionOrder` (array de strings canónicos), `blockTitles` (mapa de títulos dinámicos con fallback obligatorio a títulos canónicos), `showEditorialAds` (toggle maestro), y los toggles nativos por bloque.
   - **`/home_editorial_ads/{adId}`**: Colección canónica para anuncios editoriales e interactivos del feed. Prohibido mezclar o fusionar esta colección con `/banners`.
   - **`/banners/{bannerId}`**: Carrusel superior legacy congelado y protegido contra mutaciones no autorizadas.
   - **Reglas de Seguridad (`firestore.rules` & `storage.rules`)**:
     - Lectura pública irrestricta (`allow read: if true`).
     - Escritura administrativa exclusiva (`allow write: if isPlatformAdmin()`).
     - Almacenamiento seguro `/editorial_ads/{fileName}` validando formato de imagen y límite de tamaño $\le 5\text{ MB}$.

2. **Módulo Administrativo Web (`panel-admin/`):**
   - **`dashboardManager.js` (Baseline v5.3.0)**:
     - Motor de reordenamiento visual de secciones (Drag and Drop / Up-Down) con guardado atómico en `/dashboard/configuration`.
     - Panel de títulos dinámicos con detección de cadenas vacías para fallback canónico.
     - Interfaz CRUD completa de Campañas Editoriales con soporte para los 8 tipos canónicos (`MERCHANT_ACQUISITION`, `COURIER_RECRUITMENT`, `MERCHANT_PROMOTION`, `PRODUCT_PROMOTION`, `PLATFORM_CAMPAIGN`, `EVENT`, `SERVICE_PROMOTION`, `GENERIC_EDITORIAL`).
     - Validación previa y compresión de creativos visuales.
   - **Versionado Cache-Busting**: `dashboardManager.js?v=5.3.0` declarado inmutable en `dashboard.html`.

3. **Módulo Móvil Android Customer App:**
   - **`EditorialAdsSection.kt`**:
     - Paginador horizontal nativo `HorizontalPager` con cálculo de píldora expandida (22dp) para página activa y círculos (6dp) para páginas secundarias.
     - Temporizador reactivo de auto-scroll cada 5.000 ms (5 segundos).
     - Detección de gestos (`pagerState.isScrollInProgress`) que pausa inmediatamente el carrusel y reanuda tras 6.000 ms (6 segundos) de inactividad.
     - Resolución de identidad comercial Zero N+1 priorizando comercios vivos en memoria con fallback a snapshot estático.
     - Filtrado temporal canónico en cliente mediante `isCurrentlyValid(nowMs)` evaluando `startAt` y `endAt` contra el timestamp local.
     - Retorno inmediato y altura 0dp al estar inactivo (`showEditorialAds == false` o `ads.isEmpty()`), evitando Layout Shifts (CLS = 0).
     - Si existe exactamente 1 anuncio (`ads.size == 1`), renderiza Card estática sin paginador, sin dots ni autoplay.
   - **`DestinationRouter.kt`**:
     - Función `navigateEditorialAd` que despacha acciones seguras:
       - `EXTERNAL_URL`: Forzado estricto de esquema HTTPS (rechazo total de HTTP plano).
       - `INTERNAL_ROUTE`: Ruteo resiliente a rutas internas (`solicitar_envio_form`, etc.).
       - `MERCHANT`: Navegación directa hacia `comercio_detalle_screen/{businessId}`.
       - `PRODUCT`: Apertura atómica del modal de producto con `productId` asociado (`comercio_detalle_screen/{businessId}?productId={productId}`).
   - **`CustomerHomeFeedSection.kt`**:
     - Bucle determinístico que itera sobre `sectionOrder`.
     - Inmunidad hacia atrás: si `EDITORIAL_ADS` no está presente en `sectionOrder`, el normalizador `getNormalizedSectionOrder()` lo anexa automáticamente al final del feed justo después de `EXPRESS_DELIVERY`.

4. **Blindaje de Núcleos Congelados Adyacentes:**
   - **X→Y Delivery 2.0 (ADR-015 / C27 & ADR-029)**: Tarifa base C$ 35 + C$ 10/km, Geocoder nativo y FusedLocation blindados. Prohibida la inclusión de Google Places SDK.
   - **Courier Core & Balances (ADR-016 & ADR-018)**: Arqueos, depósitos y balances intactos.
   - **Merchant Settlement Lifecycle (ADR-019)**: Liquidaciones financieras inmutables.
   - **Merchant Image Optimization (ADR-020)**: Compresión y renderizado de tarjetas sin regresiones.
   - **Gobernanza de Cierre X→Y (ADR-029)**: Autoridad exclusiva de `/deliveryTrips` y desacoplamiento contable total de Commerce.

---

## 3. Protocolo Obligatorio Ante Futuras Modificaciones

Cualquier cambio futuro sobre el subsistema cubierto por este ADR requerirá de forma obligatoria:
1. **Apertura de una Nueva Fase Formal de Ingeniería** con solicitud explícita humana.
2. **Prohibición de Refactorings Masivos**: Intervenciones quirúrgicas y auditables únicamente.
3. **Validación E2E Tripartita**: Admin Web + Firestore + Customer App (Android & Flutter).
4. **Mantenimiento del Desacoplamiento**: Prohibido unificar `/banners` con `/home_editorial_ads`.
