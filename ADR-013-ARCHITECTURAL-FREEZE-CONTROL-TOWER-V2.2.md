# ADR-013: Architectural Freeze — Merchant Control Tower Enterprise v2.2

## Estado
**Aceptado y Congelado (Baseline)** — *Agosto 2026*

---

## 1. Contexto y Justificación
El módulo **Merchant Web → Control Tower** (`merchant-web/src/modules/DeliveryControlTowerModule.tsx`) ha sido objeto de una auditoría forense profunda y una reparación quirúrgica integral tras superar con éxito la certificación P0/P1/P2:
- Solución definitiva al renderizado del mapa Leaflet (`0 Maps API Cost`).
- Suscripción en tiempo real con aislamiento estricto Tenant / Merchant (`businessId`).
- Administrador dinámico de telemetría GPS con diffing de listeners por courier asignado (cumplimiento estricto de **ADR-003**).
- Resolver canónico de identidad de repartidores (`assignedCourierId` prioritario).
- Eliminación absoluta de coordenadas ficticias/hardcodeadas.
- Clasificación visual de frescura GPS y alertas operacionales cruzadas en tiempo real.

Para proteger este estado estable y evitar regresiones por "mejoras" accidentales o refactors innecesarios, se declara formalmente el **Architectural Freeze y Baseline Inmutable** de este módulo.

---

## 2. Declaración del Baseline Inmutable

```text
CONTROL_TOWER_BASELINE (v2.2 Enterprise)
        │
        ▼
VERSION CERTIFICADA
        │
        ├── 🚫 NO REFACTOR
        ├── 🚫 NO REBUILD
        ├── 🚫 NO CAMBIO DE MAP ENGINE (Leaflet CartoDB 0-Cost es la norma)
        ├── 🚫 NO CAMBIO DE MODELO GPS (Diffing individual por courier relevante)
        ├── 🚫 NO CAMBIO DE SECURITY (Reglas Firestore intactas / Aislamiento Tenant)
        └── 🛡️ SOLO CAMBIOS QUIRÚRGICOS AUTORIZADOS
```

---

## 3. Pilares de Protección y Gobernanza

### A. Prohibición de Refactor y Rebuild Masivo
- Queda terminantemente prohibido reescribir o reconstruir el módulo `DeliveryControlTowerModule.tsx` desde cero.
- Cualquier intervención futura debe ser estrictamente quirúrgica, aditiva y motivada por evidencia objetiva (logs/stack traces).

### B. Inmutabilidad del Motor Cartográfico Web
- El motor oficial de cartografía web para el Merchant Portal es **Leaflet con CartoDB Voyager** (`0 Maps API Cost`).
- No se permite la migración unilateral a Google Maps JavaScript API ni la introducción de costos de facturación o API keys sin aprobación ejecutiva y un ADR formal.

### C. Inmutabilidad del Modelo de Telemetría GPS
- El consumo de `/ubicaciones_repartidores` debe mantenerse bajo el modelo de **Administrador Dinámico de Suscripciones Individuales (Diffing)**.
- Queda estrictamente prohibido reinstaurar listeners globales sobre toda la colección `/ubicaciones_repartidores` para proteger el aislamiento de flota entre comercios y el presupuesto de lecturas de Firestore (**ADR-003**).

### D. Prioridad Canónica de Identidad
- Se mantiene inmutable la jerarquía de resolución del repartidor:
  `assignedCourierId` (canónico) > `courierId` > `motorizadoId` > `driverId`.
- No asumir campos legacy como única fuente de verdad.

### E. Integridad de Coordenadas (Zero Mock Policy)
- Si un pedido, cliente, sucursal o courier no dispone de coordenadas geográficas válidas reales, **nunca se fabricarán coordenadas por defecto ni marcadores ficticios**.

---

## 4. Criterios de Aceptación para Futuros Cambios
Toda modificación que afecte directa o indirectamente a la Torre de Control deberá:
1. Demostrar la causa raíz mediante auditoría forense previa.
2. Mantener la suite de compilación `npm run build` en código 0 sin warnings de TypeScript.
3. Ejecutar pruebas de no regresión sobre el Dashboard, Orders y el flujo operativo de asignación.
4. Generar el reporte de validación antes de desplegar a producción.
