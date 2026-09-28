# ADR-003: Performance, Cost Optimization & Scalability Governance

**Estado:** `ACEPTADO Y DE CUMPLIMIENTO OBLIGATORIO`  
**Fecha:** 31 de Julio de 2026  
**Autores:** Equipo de Arquitectura BlueSystem Enterprise  
**Afecta a:** Todos los módulos del sistema (Presente y Futuro)

---

## 1. Contexto

Con la conclusión del **Sprint 14.0 (Performance, Cost Optimization & Scalability Foundation)**, BlueSystem Delivery ha optimizado el consumo de datos para operar con cientos o miles de restaurantes minimizando costos de Firestore, Cloud Functions, ancho de banda y latencia. 

Para evitar regresiones futuras en la arquitectura donde nuevos desarrollos introduzcan consultas ineficientes o listeners costosos, este ADR establece **reglas técnicas de gobernanza permanentes e inquebrantables**.

---

## 2. Reglas Arquitectónicas Permanentes (De Cumplimiento Obligatorio)

### 🔴 Regla 1: Prohibición Estricta de Consultas $N+1$
- **Queda estrictamente prohibido** ejecutar consultas a la base de datos dentro de bucles (`for`, `forEach`, `map`).
- **Solución Obligatoria:** Las operaciones de lectura o escritura deben realizarse mediante documentos agregados sintetizados o consultas por lotes (`whereIn`, `WriteBatch`).

### 🔴 Regla 2: Uso Exclusivo de Documentos Agregados sobre Listeners Masivos (CQRS Light)
- **Queda prohibido** suscribir listeners permanentes (`addSnapshotListener`) a colecciones crudas con alto volumen de documentos (ej. `orders`, `inventory`, `payments`).
- **Solución Obligatoria:** Todas las pantallas de alto nivel (Dashboard, KDS, Analytics) deben consumir un único documento agregado sintetizado (`dashboard_summary`, `kds_summary`, `daily_analytics`) actualizado por eventos de dominio.
- Los listeners individuales deben ser **efímeros** (se conectan para una transacción específica, como un pago pendiente, y se desconectan inmediatamente tras finalizar).

### 🔴 Regla 3: Política Obligatoria de Archivado de Datos (Data Lifecycle)
- Toda colección activa de crecimiento lineal (`orders`, `kds_history`, `audit_logs`, `inventory_reservations`) debe definir una política de retención activa de máximo 90 días.
- Los registros que superen el umbral deben trasladarse automáticamente a colecciones de archivado (`orders_archive`, `audit_archive`) para mantener el tamaño de las colecciones activas pequeño e instantáneo.

### 🔴 Regla 4: Presupuesto Máximo de Lecturas y Escrituras por Pantalla (Firestore Budget)
- Cada nueva interfaz o pantalla debe definir y justificar su presupuesto máximo de lecturas ($R$) y escrituras ($W$) por sesión de usuario.
  - **Dashboard:** 1 lectura (`dashboard_summary`).
  - **Menú Cliente:** 1 lectura de versión (`menuVersion`). Descarga de catálogo solo si la versión cambió.
  - **KDS:** 1 lectura de documento agregado (`kds_summary`) + consulta filtrada de pedidos en estados activos (`QUEUED`, `PREPARING`, `ASSEMBLING`).
- Ninguna pantalla podrá sobrepasar su presupuesto sin aprobación formal de arquitectura.

### 🔴 Regla 5: Justificación Obligatoria de Impacto Financiero en Cambios Arquitectónicos
- Cualquier propuesta de refactorización o adición de nuevo módulo debe justificar explícitamente:
  1. **Impacto en Latencia (ms):** Tiempo de carga esperado.
  2. **Impacto en Ancho de Banda y Almacenamiento (Bytes).**
  3. **Impacto Financiero estimado (USD) en Firestore y Cloud Functions.**

---

## 3. Consecuencias y Auditoría

- **Revisión de Código:** Cualquier Pull Request que viole estas reglas (ej. bucle con consultas internas o listeners permanentes sin justificación) será **rechazado automáticamente**.
- **Monitoreo Continuo:** Se mantendrá activo el `FirestoreCostTracker` y `PerformanceMetricsEngine` para auditar el presupuesto operativo por restaurante en tiempo real.
