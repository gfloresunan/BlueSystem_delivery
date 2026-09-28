# BSD-ACT21-PERMISSION-AUDIT
## Matriz de Permisos y Control de Acceso EIAM
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Roles con Acceso a Brand Manager
- `super_admin`: Acceso Completo (Lectura, Creación, Modificación, Archivado).
- `admin`: Acceso Completo (Lectura, Creación, Modificación, Archivado).
- `auditor`: Acceso de Solo Lectura y Previsualización.
- `supervisor`: **Denegado**.
- `operator`: **Denegado**.
- `support`: **Denegado**.
- `customer`: **Denegado**.
- `courier`: **Denegado**.

### 2. Validación de Entrada
El acceso está protegido en dos capas:
1. **Frontend Gate (`AuthReadyGate`):** Comprobación de Custom Claims en el token JWT antes de renderizar la pestaña.
2. **Backend Security Rules (`firestore.rules` & `storage.rules`):** Reglas atómicas en base de datos que impiden cualquier escritura a usuarios sin rol de administración.
