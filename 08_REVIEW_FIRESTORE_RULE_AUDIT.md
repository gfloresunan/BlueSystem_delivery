# 08. Auditoría de Reglas de Seguridad en Firestore para Reseñas

**Proyecto:** BlueSystem Enterprise / BlueSystem Delivery  
**Proyecto Firebase:** `bluesystem-7c9af`  
**Colecciones Auditadas:** `/businesses/{businessId}/reviews` y `/reviews`  

---

## 1. Política de Seguridad

Las reglas de seguridad de Firestore deben permitir que los clientes autenticados puedan registrar opiniones sobre los comercios sin comprometer los datos del sistema ni permitir accesos globales desprotegidos (`allow write: if true`).

---

## 2. Definición Estándar Declarada en Reglas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla para Subcolección /businesses/{businessId}/reviews
    match /businesses/{businessId}/reviews/{reviewId} {
      allow read: if true; // Lectura pública para visualización del catálogo
      allow create, update: if request.auth != null && request.resource.data.businessId == businessId;
      allow delete: if request.auth != null && (request.auth.uid == resource.data.uid || request.auth.token.role == 'admin');
    }

    // Regla para Colección Raíz /reviews
    match /reviews/{reviewId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && (request.auth.uid == resource.data.uid || request.auth.token.role == 'admin');
    }
    
  }
}
```

---

## 3. Conclusión de Auditoría

1. **Sin Degradación de Seguridad:** No se aplicaron permisos globales abiertos (`allow write: if true`).
2. **Validación de Identidad:** La creación exige un cliente autenticado (`request.auth != null`).
3. **Integridad de Datos:** `request.resource.data.businessId` debe coincidir con la ruta del comercio.
