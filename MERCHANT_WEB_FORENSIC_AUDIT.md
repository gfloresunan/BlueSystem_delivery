# BLUE SYSTEM DELIVERY ENTERPRISE

## MERCHANT WEB FORENSIC AUDIT REPORT

```text
Environment:      Production
URL:              https://bluesystem-7c9af-merchant.web.app/
Execution Mode:   READ-ONLY / FORENSIC AUDIT
Audit Date:       2026-08-08
Auditor:          Antigravity AI (Senior Auditor & Lead Developer)
```

---

## 🔴 EXECUTIVE VERDICT

### **OVERALL CERTIFICATION STATUS: 🔴 CRITICAL FAILURE**

> **Summary:** The Merchant Web Portal (`merchant-web`) cannot be certified for enterprise production use. While basic catalog and settings modules attempt Firestore queries, **Authentication and Logout are completely unhandled** in the UI, **Session State and Tenant Context (`businessId`) persist indefinitely in browser `localStorage`**, and **critical core business modules (Orders, Finance, Customers, Staff, Control Tower) operate entirely on hardcoded static mock data**.

---

## 1. RESPUESTAS A PREGUNTAS CLAVE DEL PROBLEMA REPORTADO

### **Pregunta 1: ¿Por qué el usuario no puede cerrar sesión?**
* **Respuesta:** El botón "Cerrar Sesión" en la interfaz no tiene un controlador de eventos (`onClick`).
* **Evidencia:** En `merchant-web/src/layouts/MainLayout.tsx` (Línea 110-113), el elemento `<button>` carece de la propiedad `onClick`. Al hacer clic, el navegador ignora la interacción y no se desencadena ninguna acción de limpieza ni redirección.

### **Pregunta 2: ¿Firebase realmente ejecuta `signOut()`?**
* **Respuesta:** NO.
* **Evidencia:** `merchant-web/src/shared/services/firebase.ts` solo exporta la instancia de Firestore (`db = getFirestore(app)`). La función `getAuth()` ni siquiera está inicializada en la aplicación y `signOut(auth)` no existe en ningún archivo del código fuente.

### **Pregunta 3: ¿Después de logout `auth.currentUser` queda en `null`?**
* **Respuesta:** NO APLICA / INEXISTENTE.
* **Evidencia:** No hay un Auth Provider ni un observador de estado `onAuthStateChanged`. No existe gestión de ciclo de vida de usuario autenticado en el cliente web de Merchant.

### **Pregunta 4: ¿Se limpia el `businessId` al presionar logout?**
* **Respuesta:** NO.
* **Evidencia:** La clave `bluesystem_active_merchant_id` permanece guardada permanentemente en `localStorage`. Al carecer de handler de logout, el contexto del comercio no se destruye.

### **Pregunta 5: ¿Se limpia el `restaurantId`?**
* **Respuesta:** NO.
* **Evidencia:** Mismo comportamiento que `businessId`. No existe función de reseteo ni purga de almacenamiento local.

### **Pregunta 6: ¿Se limpia el estado de Zustand / State Management?**
* **Respuesta:** NO APLICA / NO IMPLEMENTADO.
* **Evidencia:** La aplicación no utiliza Zustand. Utiliza `TabStateContext` (`src/shared/context/TabStateContext.tsx`) y estado local de React. Al no haber cambio de ruta ni reseteo de contexto, los estados retenidos en memoria perduran durante toda la sesión del navegador.

### **Pregunta 7: ¿Se limpia `localStorage`?**
* **Respuesta:** NO.
* **Evidencia:** Ningún comando `localStorage.clear()` o `localStorage.removeItem()` es invocado en la aplicación.

### **Pregunta 8: ¿Se limpia `sessionStorage`?**
* **Respuesta:** NO.
* **Evidencia:** No se realiza purga de variables ni de sesión al intentar cerrar sesión.

### **Pregunta 9: ¿Existe caché en el cliente que conserva datos entre sesiones?**
* **Respuesta:** SÍ.
* **Evidencia:** `localStorage` guarda `bluesystem_active_merchant_id` y `bluesystem_merchant_dashboard_widgets_v1`. Además, el hook `useTabState` retiene sub-tabs activas y términos de búsqueda en memoria.

### **Pregunta 10: ¿Existe Firestore offline persistence habilitada?**
* **Respuesta:** NO explícita.
* **Evidencia:** En `firebase.ts` solo se llama `getFirestore(app)` sin configurar `enableIndexedDbPersistence` o `persistentLocalCache`.

### **Pregunta 11: ¿Existe información demo / mock en producción?**
* **Respuesta:** SÍ, extensivamente.
* **Evidencia:** 
  * `OrdersModule.tsx` (Línea 19-67): Arreglo estático `INITIAL_ORDERS` (`#ORD-8822 Pedro Gutiérrez`, `#ORD-8821 Carlos Mendoza`, etc.).
  * `FinanceModule.tsx` (Línea 73, 95-97): Cifras estáticas (`C$ 148,200.00`, transacciones `DEP-2026-0801`).
  * `CustomersModule.tsx` (Línea 20-24): Clientes estáticos (`Gabriel Jarquín`, `Ana Sofía Cruz`).
  * `StaffModule.tsx` (Línea 20-24): Empleados estáticos (`Juan Pérez`, `Roberto Gómez`).
  * `DeliveryControlTowerModule.tsx` (Línea 42-57): Flota estática (`Juan Martínez`, `Carlos Alemán`).

### **Pregunta 12: ¿Existe fallback automático hacia datos demo cuando falla Firestore?**
* **Respuesta:** SÍ.
* **Evidencia:** En `DashboardModule.tsx` (Línea 29), `CatalogModule.tsx` (Línea 28) y `SettingsModule.tsx` (Línea 18), se lee `localStorage.getItem('bluesystem_active_merchant_id') || 'fresh_merchant_2026'`. Si no existe sesión previa, el sistema se enlaza automáticamente al ID demo `'fresh_merchant_2026'`.

### **Pregunta 13: ¿Los datos del Dashboard vienen realmente de Firestore?**
* **Respuesta:** PARCIAL / MIXTO.
* **Evidencia:** `DashboardModule.tsx` intenta escuchar `doc(db, 'dashboard_summary', merchantId)` y `collection(db, 'orders')`, pero si la consulta no devuelve datos o la regla lo bloquea, se mantienen los ceros o estados por defecto sin notificar un error real de autenticación.

### **Pregunta 14: ¿Los pedidos (Orders) son reales de Firestore?**
* **Respuesta:** NO (Falso / Mock).
* **Evidencia:** `OrdersModule.tsx` no realiza ninguna consulta a Firestore. La actualización de estado es una simulación con `setTimeout` (Línea 108: `await new Promise(resolve => setTimeout(resolve, 750))`).

### **Pregunta 15: ¿Los productos (Products) son reales de Firestore?**
* **Respuesta:** SÍ (Real Firestore).
* **Evidencia:** `CatalogModule.tsx` (Líneas 45-51) ejecuta `onSnapshot(query(collection(db, 'products'), where('businessId', '==', merchantId)))`.

### **Pregunta 16: ¿Los clientes (Customers) son reales de Firestore?**
* **Respuesta:** NO (Mock).
* **Evidencia:** `CustomersModule.tsx` renderiza un arreglo estático `map()` de clientes duros.

### **Pregunta 17: ¿Los datos están correctamente filtrados por tenant (`businessId`)?**
* **Respuesta:** INSEGURO.
* **Evidencia:** El `businessId` se obtiene de `localStorage` no firmado en el cliente (`bluesystem_active_merchant_id`), en lugar de extraerse de un token JWT verificado con Custom Claims de Firebase Auth / EIAM. Cualquier usuario puede modificar la clave de `localStorage` en las DevTools del navegador para suplantar a otro comercio.

### **Pregunta 18: ¿Las Firestore Rules garantizan el aislamiento de datos?**
* **Respuesta:** PARCIALMENTE EN REGLAS, PERO INEFECTIVO EN FRONTEND.
* **Evidencia:** `firestore.rules` exige `request.auth.token.businessId == resource.data.businessId`. Dado que Merchant Web no implementa Firebase Auth, las peticiones se realizan como usuario unauthenticated / anónimo, provocando errores de permisos o forzando reglas laxas. Además, las colecciones `dashboard_summary` y `restaurant_settings` no cuentan con bloques `match` explícitos en `firestore.rules`, cayendo en el bloqueo global por defecto (`match /{document=**} { allow read, write: if false; }`).

### **Pregunta 19: ¿Merchant Web y Admin Panel utilizan la misma fuente de verdad?**
* **Respuesta:** NO EN TODOS LOS MÓDULOS.
* **Evidencia:** Admin Panel interactúa con colecciones reales de Firestore (`orders`, `businesses`, `users`), mientras que Merchant Web usa datos hardcoded para `orders`, `finance`, `customers` y `staff`.

### **Pregunta 20: ¿Merchant Web y Android Delivery utilizan los mismos contratos?**
* **Respuesta:** DESCONECTADO.
* **Evidencia:** Los pedidos gestionados en Android (`orders` document en Firestore) no impactan el módulo `OrdersModule.tsx` de Merchant Web porque Merchant Web no tiene un listener sobre la colección `orders` real en la vista principal de pedidos.

---

## 2. CLASIFICACIÓN DETALLADA DE HALLAZGOS Y RIESGOS

### 🚨 HALLAZGOS P0 — CRITICAL (SEGURIDAD Y MULTI-TENANCY)

#### **[P0-01] Ausencia Total de Autenticación y Autorización EIAM en Merchant Web**
* **Módulo:** `src/shared/services/firebase.ts`, `src/app/App.tsx`
* **Descripción:** No existe inicialización de Firebase Auth ni validación de JWT Claims. El usuario navega sin validar credenciales ni permisos EIAM.
* **Riesgo:** Acceso no autorizado al portal comercial.

#### **[P0-02] Aislamiento Multi-Tenant Vulnerable por Lectura de LocalStorage**
* **Módulo:** `src/modules/DashboardModule.tsx` (Línea 29), `src/modules/CatalogModule.tsx` (Línea 28)
* **Descripción:** `merchantId` se lee directamente de `localStorage.getItem('bluesystem_active_merchant_id')`.
* **Riesgo:** Suplantación de tenant (Cross-Tenant Spoofing). Cualquier cliente puede cambiar `bluesystem_active_merchant_id` en DevTools y consultar/modificar productos de otro comercio si las reglas de Firestore no bloquean el tráfico anónimo.

#### **[P0-03] Incompatibilidad de Firestore Rules con Colecciones Usadas en Merchant Web**
* **Módulo:** `firestore.rules` vs `src/modules/SettingsModule.tsx` y `src/modules/DashboardModule.tsx`
* **Descripción:** `restaurant_settings` y `dashboard_summary` son leídas por Merchant Web pero no existen reglas explícitas en `firestore.rules`.
* **Riesgo:** Bloqueo de peticiones legítimas o denegación de servicio por fallo en listeners (`PERMISSION_DENIED`).

---

### ⚠️ HALLAZGOS P1 — HIGH (LOGOUT, SESIÓN Y DATOS DEMO)

#### **[P1-01] Botón de Logout Inoperativo en MainLayout**
* **Módulo:** `src/layouts/MainLayout.tsx` (Líneas 110-113)
* **Descripción:** El botón de "Cerrar Sesión" es un elemento puramente estético sin manejador `onClick`.
* **Riesgo:** Imposibilidad de cerrar sesión, contaminación de contexto entre usuarios en dispositivos compartidos.

#### **[P1-02] Módulo de Pedidos (OrdersModule) Funciona Exclusivamente con Datos Mock**
* **Módulo:** `src/modules/OrdersModule.tsx` (Líneas 19-67, 108)
* **Descripción:** El portal no muestra los pedidos reales de la base de datos Firestore. Utiliza `INITIAL_ORDERS` y un `setTimeout` estático para simular la actualización de estado.
* **Riesgo:** El comercio no recibe ni procesa pedidos reales ingresados desde la App Cliente o el Delivery Control Tower.

#### **[P1-03] Módulo Financiero (FinanceModule) Completamente Desconectado de Firestore**
* **Módulo:** `src/modules/FinanceModule.tsx` (Líneas 73-109)
* **Descripción:** Las ventas brutas, comisiones de plataforma y depósitos bancarios son constantes string codificadas en duro en el componente React.
* **Riesgo:** Opacidad financiera y falta de trazabilidad real para el comercio.

---

### 🟡 HALLAZGOS P2 — MEDIUM (PERMANENCIA DE ESTADO Y EIAM)

#### **[P2-01] Identidad del Usuario Hardcoded en Header Principal**
* **Módulo:** `src/layouts/MainLayout.tsx` (Líneas 158-159)
* **Descripción:** Se muestra "Juan Pérez" y "OWNER (EIAM Claim)" de manera estática.
* **Riesgo:** Desorientación de usuario e inconsistencia auditables.

#### **[P2-02] Fallback Silencioso a Comercio Demo ('fresh_merchant_2026')**
* **Módulo:** Varios módulos (`DashboardModule`, `CatalogModule`, `SettingsModule`)
* **Descripción:** Ante la ausencia de ID activo, se asigna `'fresh_merchant_2026'`.
* **Riesgo:** Contaminación del entorno de producción con datos artificiales de demostración.

---

## 3. PLAN RECOMENDADO DE REMEDIACIÓN

```text
                                  REMEDIATION ROADMAP
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: SEGURIDAD & FIREBASE AUTH (P0)                                                │
│  - Inicializar getAuth(app) en shared/services/firebase.ts                           │
│  - Crear AuthProvider con onAuthStateChanged listener                                │
│  - Conectar guardias de ruta en App.tsx para redirigir a Login si currentUser === null│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 2: EIAM & CONTEXTO MULTI-TENANT (P0 / P1)                                       │
│  - Extraer businessId exclusivamente del JWT Custom Claim o colección /membership    │
│  - Implementar handler real en botón Logout de MainLayout.tsx:                       │
│      1. signOut(auth)                                                                │
│      2. localStorage.removeItem('bluesystem_active_merchant_id')                      │
│      3. Purga de TabStateContext                                                     │
│      4. Redirección a pantalla de login                                              │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 3: FIRESTORE & DATOS REALES EN MÓDULOS (P1)                                     │
│  - Reemplazar INITIAL_ORDERS por listener real onSnapshot sobre collection('orders') │
│  - Reemplazar datos estáticos de FinanceModule por agregados reales de Firestore     │
│  - Reemplazar datos estáticos de CustomersModule y StaffModule por consultas reales  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 4: REGISTRO DE FIRESTORE RULES (P0)                                             │
│  - Agregar matches explícitos en firestore.rules para:                               │
│      match /restaurant_settings/{restaurantId} { allow read, write: if ... }         │
│      match /dashboard_summary/{merchantId} { allow read: if ... }                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

```text
════════════════════════════════════════════════════════════════════════════════
                     FIN DEL INFORME DE AUDIT FORENSE
════════════════════════════════════════════════════════════════════════════════
```
