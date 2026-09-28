# REPORTE DE IMPLEMENTACIÓN UI: GANANCIA DEL MOTORIZADO & COBRO EN DESTINO
## BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001
### OBJETO 2: DESPLIEGUE DEL DOBLE BLOQUE FINANCIERO EN MODAL X→Y

---

## 1. RESUMEN DE LA IMPLEMENTACIÓN

- **Incidente:** `BSD-X2Y-COURIER-ACCEPT-TRANSACTION-AND-EARNINGS-ROOT-CAUSE-001`
- **Dominio:** BlueSystem Delivery — Delivery Express X→Y
- **Servicio:** `X_TO_Y_DELIVERY`
- **Plataforma:** Android Courier (`app`)
- **Archivos Modificados:**
  1. [`app/src/main/java/com/example/PedidosEntrantesScreen.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt) ([Líneas 1210–1300](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/PedidosEntrantesScreen.kt#L1210-L1300))
  2. [`app/src/main/java/com/example/FirebaseManager.kt`](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt) ([Líneas 497–510](file:///c:/Users/geral/OneDrive/Escritorio/TECNOCOMP%202026/Sistemas/BlueSystem_delivery/app/src/main/java/com/example/FirebaseManager.kt#L497-L510))
- **Estatus:** 🟢 **IMPLEMENTADO, COMPILADO Y CERTIFICADO**.

---

## 2. DETALLE DE LOS CAMBIOS APLICADOS

### 2.1. Eliminación de Fallbacks Hardcodeados en `FirebaseManager.kt`
En `parsePedidoOfrecido()`, se eliminó el fallback de `35.0` arbitrario, forzando a que `baseFee` provenga estrictamente del `pricingSnapshot` inmutable:

```kotlin
val effectiveGananciaRepartidor = if (serviceType == "X_TO_Y_DELIVERY") {
    val ps = doc.get("pricingSnapshot") as? Map<String, Any>
    val pPerKm = safeParseDouble(ps?.get("pricePerKm")) ?: safeParseDouble(ps?.get("perKmRate")) ?: 0.0
    val distKm = safeParseDouble(ps?.get("routeDistanceKm")) ?: safeParseDouble(ps?.get("distanceKm")) ?: routeDistanceKm
    val baseFee = safeParseDouble(ps?.get("baseFee"))
    if (courierTotalEarnings > 0.0) {
        courierTotalEarnings
    } else if (pPerKm > 0.0 && distKm > 0.0) {
        kotlin.math.round((pPerKm * distKm) * 100.0) / 100.0
    } else if (baseFee != null && baseFee > 0.0) {
        val total = customerOffer ?: pricingSnapshotAmount ?: calculatedFee
        if (total > baseFee) kotlin.math.round((total - baseFee) * 100.0) / 100.0 else 0.0
    } else {
        0.0
    }
}
```

### 2.2. Despliegue de los Dos Bloques Financieros en `PedidosEntrantesScreen.kt`

Se reemplazó el contenedor defectuoso que mezclaba Cobro con Ganancia por dos tarjetas claramente separadas con jerarquía visual:

```kotlin
// ─── BLOQUE 1: COBRO EN DESTINO / ESTADO DE COBRO (CUSTOMER_TOTAL) ───
Row(
    modifier = Modifier
        .fillMaxWidth()
        .background(if (isRecipientPayer && isCash) Color(0xFFFFFBEB) else Color(0xFFEFF6FF), RoundedCornerShape(14.dp))
        .border(1.dp, if (isRecipientPayer && isCash) Color(0xFFFDE68A) else Color(0xFFBFDBFE), RoundedCornerShape(14.dp))
        .padding(12.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
) {
    Column {
        Text(
            text = if (isRecipientPayer && isCash) "💰 COBRO EN DESTINO" else "✓ ENVÍO YA PAGADO",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = if (isRecipientPayer && isCash) Color(0xFFB45309) else Color(0xFF1D4ED8)
        )
        Text(
            text = if (isRecipientPayer && isCash) "Cobrar al destinatario" else "No cobrar en destino",
            fontSize = 11.sp,
            color = if (isRecipientPayer && isCash) Color(0xFF92400E) else Color(0xFF1E40AF)
        )
    }
    Column(horizontalAlignment = Alignment.End) {
        Text(
            text = if (isRecipientPayer && isCash) {
                "C$ ${String.format(java.util.Locale.US, "%.2f", customerTotal)}"
            } else {
                "C$ 0.00"
            },
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = if (isRecipientPayer && isCash) Color(0xFFB45309) else Color(0xFF1D4ED8)
        )
        Text(
            text = if (isCash) "EFECTIVO" else activePedido.pagoMetodo.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF64748B)
        )
    }
}

Spacer(modifier = Modifier.height(8.dp))

// ─── BLOQUE 2: GANANCIA DEL MOTORIZADO (COURIER_EARNINGS CANÓNICA) ───
Row(
    modifier = Modifier
        .fillMaxWidth()
        .background(Color(0xFFECFDF5), RoundedCornerShape(14.dp))
        .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(14.dp))
        .padding(12.dp),
    horizontalArrangement = Arrangement.SpaceBetween,
    verticalAlignment = Alignment.CenterVertically
) {
    Column {
        Text(
            text = "🛵 GANANCIA DEL MOTORIZADO",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF047857)
        )
        Text(
            text = "POR ESTE ENVÍO",
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF065F46)
        )
    }
    Column(horizontalAlignment = Alignment.End) {
        Text(
            text = "C$ ${String.format(java.util.Locale.US, "%.2f", activePedido.gananciaRepartidor)}",
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFF047857)
        )
        Text(
            text = "REMUNERACIÓN",
            fontSize = 9.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Color(0xFF059669)
        )
    }
}
```

---

## 3. COMPARATIVA ANTES VS DESPUÉS EN CASO CANÓNICO

**Parámetros:** Viaje de 15 km, Tarifa C$10/km, Base C$35. Método: Efectivo, Destinatario paga.

| Elemento | Comportamiento Anterior | Comportamiento Nuevo Corregido | Estatus |
|---|---|---|:---:|
| **Bloque 1: Cobro al Cliente** | Mostraba C$ 150.00 (confusión con ganancia) | Muestra **C$ 185.00** (`CUSTOMER_TOTAL`) | 🟢 **CORREGIDO** |
| **Bloque 2: Ganancia Courier** | Ausente | Muestra **C$ 150.00** (`COURIER_EARNINGS`) | 🟢 **CORREGIDO** |
| **Riesgo de Liquidación** | Pérdida de C$ 35 en efectivo | Custodia íntegra preservada | 🟢 **PROTEGIDO** |
