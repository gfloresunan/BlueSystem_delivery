# BSD-ACT21-BRAND-ASSETS-REPORT
## Gestión de Assets Gráficos y Políticas de Cloud Storage
**Protocol ID:** `BSD-ACT21-BRAND-MANAGER-COMMERCIAL-FOUNDATION-001`  

---

### 1. Convención de Almacenamiento
- **Ruta:** `brands/{brandId}/{timestamp}_{fileName}`
- **Tipos Permitidos:** `image/png`, `image/jpeg`, `image/webp`, `image/x-icon`.
- **Límite de Tamaño:** 5MB por archivo.

### 2. Política de Seguridad y Storage Rules
```
match /brands/{brandId}/{fileName} {
  allow read: if true;
  allow create, update: if isPlatformAdmin() && isValidCommerceImage();
  allow delete: if isPlatformAdmin();
}
```
- **Lectura Pública Justificada:** Assets requeridos para render en aplicaciones móviles no autenticadas (Customer App Splash/Home) y Storefronts públicos. No contienen información sensible ni PII.
- **Escritura Protegida:** Bloqueada exclusivamente para cuentas con rol administrativo verificado en JWT.
