# 06 — ACCOUNT STATUS ADB LOGCAT REPORT

**Dispositivo Físico:** Samsung Galaxy Z Fold 5  
**ADB Serial:** `RFCW71DR2WY`  
**Paquete:** `com.aistudio.delivery.djweq` / `com.example`  

---

## 1. Verificación de Filtro Logcat

Filtro ejecutado:
`AccountStatus|EIAM_STATUS|ComercioDetalle|FATAL EXCEPTION|AndroidRuntime|Firestore`

---

## 2. Eventos Registrados

1. **Apertura de FRITONI:**
   ```
   D/ComercioDetalleVM: Cargando sucursales para negocio dlRY2ZVUqPR2Fxoc3cazcOxxRJg2
   I/EIAM_STATUS_NORMALIZATION: rawStatus=OPERATIONAL normalizedStatus=OPERATIONAL source=branches
   D/ComercioDetalleVM: Sucursales cargadas exitosamente: 2 (Principal: Fritoni Boer)
   ```

2. **Apertura de El Chanchito:**
   ```
   D/ComercioDetalleVM: Cargando sucursales para negocio bbb760d5-a8f3-4700-9a96-f58f11f345ac
   I/EIAM_STATUS_NORMALIZATION: rawStatus=null normalizedStatus=ACTIVE source=branches
   D/ComercioDetalleVM: Sucursales cargadas exitosamente: 1 (Principal: Sucursal Principal)
   ```

3. **Prueba de Inyección de Estado Desconocido (Simulado):**
   ```
   W/EIAM_STATUS_NORMALIZATION: rawStatus=UNKNOWN_STATE_99 normalizedStatus=UNKNOWN source=branches
   ```

---

## 3. Resultado de Excepciones Fatal
- **`FATAL EXCEPTION` Count:** 0
- **`CustomClassMapper.deserializeToEnum` Errors:** 0
- **App Crash Count:** 0
