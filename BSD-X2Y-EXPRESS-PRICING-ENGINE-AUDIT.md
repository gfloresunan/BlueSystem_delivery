# AUDITORÍA DEL MOTOR CANÓNICO DE TARIFAS X→Y
## BlueSystem Delivery Enterprise v6.1.0
### Referencia: BSD-X2Y-EXPRESS-PRICING-ENGINE-AUDIT

---

### 1. Resumen Ejecutivo
Se auditó y certificó la implementación de la política tarifaria canónica para encomiendas express X→Y.
Se eliminó la discrepancia detectada previamente (donde una cotización de 15,532 metros resultaba en montos dispares entre la app de cliente, la app de motorizado y el backend). A partir de esta versión, rige la política **KM_BLOCK_2DEC** unificada bajo un `pricingSnapshot` protegido por reglas de base de datos bajo el modelo **IMMUTABLE BY DEFAULT + CONTROLLED SUPER ADMIN OVERRIDE**, grabado en el documento de `/deliveryTrips`.

---

### 2. Especificación de la Regla de Redondeo Canónica

$$\text{distanciaKm} = \frac{\text{round}\left(\frac{\text{distanciaMetros}}{1000} \times 100\right)}{100}$$

$$\text{cargoDistancia} = \frac{\text{round}(\text{distanciaKm} \times \text{tarifaPorKm} \times 100)}{100}$$

$$\text{totalCotizado} = \frac{\text{round}((\text{tarifaBase} + \text{cargoDistancia}) \times 100)}{100}$$

#### Ejemplo Numérico Certificado (Caso Managua 15,532 m)
- **Metros brutos**: 15,532 m
- **Km redondeados (KM_BLOCK_2DEC)**: $\text{round}(15.532 \times 100) / 100 = 15.53\text{ km}$
- **Tarifa Base**: $C\$\;35.00$
- **Tarifa Canónica por Km (`pricePerKm`)**: $C\$\;15.00$
- **Cargo por distancia**: $15.53 \times 15.00 = C\$\;232.95$
- **Total Final Inmutable**: $35.00 + 232.95 = \mathbf{C\$\;267.95}$

---

### 3. Modelo de Inmutabilidad y Gobernanza Técnica

#### A. Clasificación Formal de Inmutabilidad
**IMMUTABLE BY DEFAULT + CONTROLLED SUPER ADMIN OVERRIDE**

| Rol / Actor | Capacidad de Modificar `pricingSnapshot` Post-Creación | Mecanismo de Control |
|---|:---:|---|
| **Cliente (`customer`)** | ❌ DENEGADO | Firestore Rules (`hasOnly` whitelist en actualización) |
| **Motorizado (`courier`)** | ❌ DENEGADO | Firestore Rules (`hasOnly` whitelist operativo) |
| **Admin Estándar / Operador** | ❌ DENEGADO | Firestore Rules (`affectedKeys().hasAny(...)` bloqueo explícito) |
| **Super Admin (`super_admin`)** | ✅ OVERRIDE CONTROLADO | Firestore Rules (`isSuperAdmin()` bypass auditado) |

> [!IMPORTANT]
> El bypass de Super Admin no representa una mutación desatendida; está concebido exclusivamente para resolución de disputas forenses, errores de conciliación bancaria o fallas de red catastróficas, quedando cualquier intervención registrada inmutablemente en `/audit_events`.

#### B. Almacenamiento Canónico en Firestore
- Documento: `/system_config/global`
- Campo: `xToYPricing`
- Estructura Unificada (Canónico + Legacy Alias):
  ```json
  {
    "baseFee": 35.0,
    "pricePerKm": 15.0,
    "perKmRate": 15.0,
    "calculationPolicy": "KM_BLOCK_2DEC",
    "version": "system_config_global_v1",
    "updatedAt": "2026-09-17T22:15:00Z",
    "updatedBy": "superadmin@bluesystemdelivery.com"
  }
  ```

#### C. Registro de Auditoría Inmutable
Toda modificación de tarifas a través del Panel Admin se estampa en `/audit_events`:
- `action`: `"UPDATE_X_TO_Y_PRICING"`
- `module`: `"DELIVERY_EXPRESS"`
- `previousValues`: Valores anteriores de tarifas.
- `newValues`: Nuevos valores aplicados (`baseFee`, `pricePerKm`, `perKmRate`).
- `performedBy`: Identidad del administrador autenticado.
- `timestamp`: `serverTimestamp()`.

---

### 4. Veredicto de Auditoría
🟢 **AUDIT PASSED / CERTIFIED SSOT**: Cero divergencia financiera. Tanto el cliente como el repartidor y el administrador observan exactamente el mismo monto inmutable (`pricingSnapshot.calculatedAmount`).
