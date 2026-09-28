# C2D25E.4 — TENANT, BRAND & SUBSCRIPTION AUDIT
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. La Cadena de Dominio Canónica

La jerarquía multi-marca de BlueSystem Delivery Enterprise está formalizada en `functions/src/domain/platform/models.ts`:

```text
TENANT (/tenants/{tenantId})
  └── BRAND (/brands/{brandId})
        └── SUBSCRIPTION (/subscriptions/{subscriptionId})
              └── CAPABILITY MODULES & QUOTAS
                    └── GATEKEEPER DECISION
                          └── APP CONFIG (/app_configs/{configId})
```

---

### 2. Aislamiento y Compatibilidad Multiplataforma

1. **Aislamiento Multi-Tenant:** Cada registro operativo (`order`, `user`, `device`, `transaction`) está indexado y protegido por su `tenantId`.
2. **Multi-Brand Flexible:** Un tenant puede tener una o varias marcas registradas (`BrandEntity`), con paletas cromáticas (`BrandVisualConfig`), tipografías y enlaces a Cloud Storage para logotipos y banners.
3. **Consumo por Flutter:**
   - La futura aplicación Flutter simplemente carga el documento `/brands/{brandId}` y `/app_configs/{configId}` al iniciar.
   - Aplica dinámicamente el `ThemeData` de Flutter (Color primario, secundario, de fondo y fuentes) en tiempo de ejecución de forma análoga a como lo hace `BrandHydrationResolver.kt` en Compose.
4. **Cero Modelos Paralelos:** No se requieren modelos alternativos como `FlutterBrand` o `FlutterTenant`.

---

### 3. Veredicto

```text
══════════════════════════════════════════════════════════════
TENANT / BRAND / SUBSCRIPTION VERDICT:
🟢 FULLY READY & COMPATIBLE WITH MULTI-PLATFORM ECOSYSTEM
══════════════════════════════════════════════════════════════
```
