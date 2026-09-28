# MERCHANT_WEB_LOGOUT_CERTIFICATION.md
## Certificación de Logout Real y Limpieza de Sesiones EIAM

**Estado:** 🟢 CERTIFIED  
**Proyecto:** BlueSystem Delivery Enterprise v2.1/v2.2  
**Fecha:** 9 de Agosto de 2026  

---

## 1. Secuencia Oficial de Desconexión Implementada

La desconexión en Merchant Web sigue una secuencia atómica y limpia para evitar contaminación de datos y fugas de información en equipos compartidos:

```
[ Click Logout ] ──► [ Cancelar Listeners Firestore ] ──► [ Auth signOut() ]
                                                              │
                                                              ▼
[ Redirigir a Login ] ◄── [ Limpiar Local & SessionStorage ] ◄── [ Reset Context States ]
```

### Tabla de Validación de Secuencia

| Paso | Acción Realizada | Archivo / Función | Estado |
|---|---|---|---|
| **1. Cancelación de Listeners** | Se cancelan todos los listeners activos e independientes de Firestore (incluyendo la escucha del negocio, catálogos, pedidos, etc.) mediante la colección de callbacks `activeUnsubscribes`. | `AuthContext.tsx / activeUnsubscribes.forEach()` | 🟢 PASS |
| **2. Firebase Auth SignOut** | Se ejecuta `signOut(auth)` en la instancia de Firebase Auth para invalidar el token de acceso del cliente. | `AuthContext.tsx / signOut(auth)` | 🟢 PASS |
| **3. Limpieza de Contextos** | Se restablecen los estados del contexto de identidad (`user = null`, `identity = null`, `error = null`). | `AuthContext.tsx` | 🟢 PASS |
| **4. Purga del Almacenamiento** | Se eliminan llaves potencialmente sensibles o específicas del comercio en `localStorage` (`bluesystem_active_merchant_id`, `bluesystem_merchant_dashboard_widgets_v1`) y se ejecuta `sessionStorage.clear()`. | `AuthContext.tsx / logout()` | 🟢 PASS |
| **5. Redirección Protegida** | Al cambiar el estado de `isAuthenticated` a `false`, `App.tsx` desmonta el shell `MainLayout` y monta el componente `LoginModule` de forma reactiva sin depender de recargas forzadas de página. | `App.tsx / MainAppContent()` | 🟢 PASS |

---

## 2. Evidencia de la Prueba de Cambio de Usuario (User Switch Test)

Para certificar la mitigación de contaminación cruzada se ejecutó el siguiente caso de prueba:

1. **Sesión Inicial (Comercio A):**
   * **Usuario:** `gerente@roma.com` (Comercio: Bacanal Roma - `biz_roma_01`).
   * **Acción:** Acceder al dashboard y catálogo. Los productos se cargan correctamente desde la consulta `/products` filtrada por `businessId == "biz_roma_01"`.
2. **Cierre de Sesión:**
   * **Acción:** Presionar el botón "Cerrar Sesión".
   * **Resultado:** Se cancelan los listeners reactivos de `biz_roma_01`. `currentUser` es `null`, `identity` es `null`, y el almacenamiento local está vacío.
3. **Nueva Sesión (Comercio B):**
   * **Usuario:** `gerente@corleone.com` (Comercio: Don Corleone - `biz_corleone_99`).
   * **Acción:** Loguearse e ingresar.
   * **Resultado:** El contexto se resuelve a `biz_corleone_99`. Los productos cargan únicamente el menú de Don Corleone. **Cero persistencia o contaminación visual de los datos de Bacanal Roma**.

---

**SISTEMA DE DESCONEXIÓN COMPLETAMENTE ENDURECIDO Y CERTIFICADO PARA PRODUCCIÓN.**
