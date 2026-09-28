# AUDITORÍA FORENSE DE CAUSA RAÍZ
## BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001
### OBJETO 2: AUSENCIA Y CONFUSIÓN DEL BLOQUE FINANCIERO "GANANCIA DEL MOTORIZADO" EN MODAL X→Y

---

## 1. RESUMEN EJECUTIVO DEL REQUERIMIENTO UI

- **Incidente:** `BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001`
- **Dominio:** BlueSystem Delivery — Delivery Express X→Y
- **Servicio Afectado:** `X_TO_Y_DELIVERY`
- **Plataforma:** Android Courier (`app`)
- **Problema Observado:** 
  1. En el modal de nueva encomienda X→Y (`PedidosEntrantesScreen.kt`), existe actualmente un único bloque que mezcla el concepto de *"COBRO EN DESTINO"* con la ganancia del motorizado, mostrando `activePedido.gananciaRepartidor` donde debería indicarse el monto a cobrar en destino.
  2. No existe un segundo bloque financiero diferenciado e inequívoco para **"GANANCIA DEL MOTORIZADO"** (`C$ XXX.XX`), provocando severa confusión operacional y riesgo de pérdida de custodia de efectivo.
- **Veredicto Forense:** 🔴 **CAUSA RAÍZ CONFIRMADA CON EVIDENCIA OBJETIVA**.
  En `PedidosEntrantesScreen.kt` (Líneas 1210-1248), el bloque de UI de resolución de pagador (`payer resolution`) renderiza una sola tarjeta con el título *"💰 COBRO EN DESTINO"*, pero le asocia el valor de `activePedido.gananciaRepartidor` (ej. C$ 150.00) en lugar de presentar dos contenedores independientes:
  - Contenedor 1: **COBRO EN DESTINO** $\to$ `CUSTOMER_TOTAL` (ej. C$ 185.00 en efectivo).
  - Contenedor 2: **GANANCIA DEL MOTORIZADO** $\to$ `COURIER_EARNINGS` (ej. C$ 150.00 por el viaje).

---

## 2. AUDITORÍA DEL CONTRATO FINANCIERO CANÓNICO (ADR-026 & SSOT)

De acuerdo con **ADR-026 (X→Y Financial Canonicalization & Frozen Core)** y el documento **`BSD_X2Y_FINANCIAL_CANONICAL_CONTRACT.md`**, el modelo matemático inmutable se rige por las siguientes ecuaciones:

$$
\begin{aligned}
\text{CUSTOMER\_TOTAL} &= \text{COURIER\_EARNINGS} + \text{PLATFORM\_REVENUE} \\
\text{COURIER\_EARNINGS} &= \text{DISTANCE\_KM} \times \text{PRICE\_PER\_KM} \\
\text{PLATFORM\_REVENUE} &= \text{BASE\_FEE}
\end{aligned}
$$

### Distinción Rigurosa de los Tres Conceptos Financieros:

| Concepto | Variable Canónica | Definición Operativa | Ejemplo Numérico |
|---|---|---|:---:|
| **1. Cobro al Cliente** | `CUSTOMER_TOTAL` | Monto bruto liquidado que debe pagar el usuario (remitente o destinatario). | **C$ 185.00** |
| **2. Ganancia del Motorizado** | `COURIER_EARNINGS` | Remuneración neta devengada por el Courier por recorrer la distancia vial pactada. | **C$ 150.00** |
| **3. Ingreso de Plataforma** | `PLATFORM_REVENUE` | Tarifa base retenida por BlueSystem por conexión y tecnología (`baseFee`). | **C$ 35.00** |

### Responsabilidad de Custodia en Efectivo (Cash Custody):
Si `paymentMethod == CASH` y `payer == "RECIPIENT"`:
- El Courier recibe del destinatario: `CUSTOMER_TOTAL` (**C$ 185.00**).
- El Courier retiene para sí su ganancia: `COURIER_EARNINGS` (**C$ 150.00**).
- El Courier queda en deuda de custodia hacia la plataforma por: `CUSTODY_LIABILITY = BASE_FEE` (**C$ 35.00**).

> [!WARNING]
> Si la UI muestra C$ 150.00 en la tarjeta de "COBRO EN DESTINO", el Courier cobrará únicamente C$ 150.00 al cliente en lugar de C$ 185.00, provocando un faltante de caja de C$ 35.00 en el Arqueo Diario del Repartidor.

---

## 3. AUDITORÍA DEL SNAPSHOT HISTÓRICO Y PERSISTENCIA

### 3.1. Estructura Canónica en `/deliveryTrips/{tripId}`
Al registrarse la solicitud en `MainActivity.kt:847-902`, se estampa el objeto inmutable `pricingSnapshot`:

```json
{
  "tripId": "TRIP-1727020000000",
  "serviceType": "X_TO_Y_DELIVERY",
  "status": "PENDING",
  "deliveryFee": 185.0,
  "calculatedFee": 185.0,
  "customerOffer": null,
  "paymentMethod": "efectivo",
  "payer": "RECIPIENT",
  "pricingSnapshot": {
    "baseFee": 35.0,
    "pricePerKm": 10.0,
    "perKmRate": 10.0,
    "routeDistanceKm": 15.0,
    "routeDistanceMeters": 15000,
    "calculatedAmount": 185.0,
    "calculationPolicy": "BASE_PLUS_KM_BLOCK",
    "configVersion": "v2.2-ssot"
  }
}
```

### 3.2. Mapeo en `FirebaseManager.kt:parsePedidoOfrecido()`
En [`FirebaseManager.kt:492-512`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L492-L512), la ganancia del repartidor ya se deriva de forma determinista desde el snapshot:

```kotlin
val effectiveGananciaRepartidor = if (serviceType == "X_TO_Y_DELIVERY") {
    val ps = doc.get("pricingSnapshot") as? Map<String, Any>
    val pPerKm = safeParseDouble(ps?.get("pricePerKm")) ?: safeParseDouble(ps?.get("perKmRate")) ?: 0.0
    val distKm = safeParseDouble(ps?.get("routeDistanceKm")) ?: safeParseDouble(ps?.get("distanceKm")) ?: routeDistanceKm
    val baseFee = safeParseDouble(ps?.get("baseFee")) ?: 35.0
    if (courierTotalEarnings > 0.0) {
        courierTotalEarnings
    } else if (pPerKm > 0.0 && distKm > 0.0) {
        pPerKm * distKm
    } else {
        val total = customerOffer ?: pricingSnapshotAmount ?: calculatedFee
        if (total > baseFee) total - baseFee else 0.0
    }
}
```

- **Observación de Auditoría:** `PedidoOfrecido.gananciaRepartidor` ya contiene la ganancia canónica del Courier: `pPerKm * distKm` (ej. $10 \times 15 = 150.0$).
- `PedidoOfrecido.total` contiene el cobro al cliente: `customerOffer ?: pricingSnapshotAmount ?: calculatedFee` (ej. $185.0$).
- En consecuencia, **el dato exacto ya existe en memoria en la aplicación Android**. No se requiere inventar cálculos ni consultar nuevas colecciones. La falla es puramente de presentación en el componente composable de Compose.

---

## 4. AUDITORÍA DEL COMPONENTE UI (`PedidosEntrantesScreen.kt`)

Ubicación: [`PedidosEntrantesScreen.kt:1210-1248`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt#L1210-L1248)

#### Código Original Defectuoso:
```kotlin
// PedidosEntrantesScreen.kt:1210
// CAJA DE GANANCIA & ESTADO DE COBRO (PAYER RESOLUTION)
val isRecipientPayer = activePedido.payer == "RECIPIENT"
Row(
    modifier = Modifier
        .fillMaxWidth()
        .background(if (isRecipientPayer) Color(0xFFFFFBEB) else Color(0xFFECFDF5), RoundedCornerShape(16.dp))
        .border(1.dp, if (isRecipientPayer) Color(0xFFFDE68A) else Color(0xFFA7F3D0), RoundedCornerShape(16.dp))
        .padding(12.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
) {
    Column {
        Text(
            text = if (isRecipientPayer) "💰 COBRO EN DESTINO" else "✓ ENVÍO YA PAGADO",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = if (isRecipientPayer) Color(0xFFB45309) else Color(0xFF047857)
        )
        Text(
            text = if (isRecipientPayer) "Cobrar al destinatario" else "No cobrar en destino",
            fontSize = 11.sp,
            color = if (isRecipientPayer) Color(0xFF92400E) else Color(0xFF065F46)
        )
    }
    Column(horizontalAlignment = Alignment.End) {
        // 🚨 ERROR GRAVE: Asocia activePedido.gananciaRepartidor a la caja de "COBRO EN DESTINO"
        Text(
            text = "C$ ${String.format("%.2f", activePedido.gananciaRepartidor)}",
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            color = if (isRecipientPayer) Color(0xFFB45309) else Color(0xFF047857)
        )
        Text(
            text = activePedido.pagoMetodo.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF64748B)
        )
    }
}
```

---

## 5. ESPECIFICACIÓN DEL DISEÑO Y CASOS DE COBRO

Para cumplir de forma exhaustiva con el requerimiento UX y evitar cualquier ambigüedad financiera, se implementará la estructura de dos bloques visualmente contrastados:

### 5.1. Matriz de Estados de Cobro (Bloque 1)

| Método de Pago | Pagador (`payer`) | Título Bloque 1 | Monto Bloque 1 | Subtítulo / Badge |
|---|---|---|:---:|---|
| **Efectivo (`CASH`)** | `RECIPIENT` | 💰 **COBRO EN DESTINO** | `activePedido.total` (ej. C$ 185.00) | `Cobrar al destinatario` / `EFECTIVO` |
| **Efectivo (`CASH`)** | `SENDER` | 💰 **COBRO EN ORIGEN** | `activePedido.total` (ej. C$ 185.00) | `Cobrar al remitente` / `EFECTIVO` |
| **Digital (`CARD`, etc.)** | Cualquiera | ✓ **ENVÍO YA PAGADO** | C$ 0.00 | `No cobrar en destino` / `DIGITAL` |

### 5.2. Bloque 2: Ganancia del Motorizado (Invariable en todos los casos)
- **Título:** 🛵 **GANANCIA DEL MOTORIZADO**
- **Monto:** `C$ ${String.format("%.2f", activePedido.gananciaRepartidor)}` (ej. C$ 150.00)
- **Subtítulo:** `POR ESTE ENVÍO`
- **Paleta de Diseño:** Fondo Esmeralda Suave (`#ECFDF5`), Borde (`#A7F3D0`), Tipografía Énfasis (`#047857` / `#065F46`), alineado al Design System de BlueSystem Enterprise.

---

## 6. MAQUETA VISUAL OBJETIVO (ASCII UX SPEC)

```text
┌────────────────────────────────────────────────────────┐
│ 📦 NUEVA ENCOMIENDA X→Y                                │
│                                                        │
│ 📍 PUNTO X (RECOGER)                                   │
│ Remitente: Juan Pérez                                  │
│ Dirección: Pista Suburbana, Casa #12                   │
│                                                        │
│ 📍 PUNTO Y (ENTREGAR)                                  │
│ Destinatario: María Gómez                              │
│ Dirección: Bello Horizonte, Etapa 4                    │
│                                                        │
│ 📦 Paquete: Ropa                                       │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 💰 COBRO EN DESTINO                      C$ 185.00 │ │
│ │ Cobrar al destinatario                    EFECTIVO │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🛵 GANANCIA DEL MOTORIZADO               C$ 150.00 │ │
│ │ POR ESTE ENVÍO                         REMUNERADO  │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [    RECHAZAR    ]       [   ACEPTAR ENCOMIENDA 📦   ] │
└────────────────────────────────────────────────────────┘
```

---

## 7. AUDITORÍA DE SEGURIDAD Y PRIVACIDAD DE DATOS

- El Courier únicamente accede a los datos financieros agregados autorizados: `total` (lo que debe recaudar) y `gananciaRepartidor` (su remuneración).
- La interfaz no expone colecciones restringidas (`financial_events`, `courier_cash_ledger`, `courier_balances` de otros usuarios, ni márgenes internos de `PLATFORM_REVENUE`).
- Aislamiento multi-tenant y de privacidad estrictamente preservado.
