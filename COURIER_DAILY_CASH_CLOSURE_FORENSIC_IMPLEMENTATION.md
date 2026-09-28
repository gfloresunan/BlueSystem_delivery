# BLUESYSTEM DELIVERY ENTERPRISE
# FASE 2: COURIER DAILY CASH CLOSURE + BANK DEPOSIT + OFFICIAL ACT + ADMIN RECONCILIATION
## Documento Maestro de Arquitectura, Flujo Operacional, Contratos y Verificación Forense

**Sistema:** BlueSystem Delivery Enterprise  
**Versión:** 2.2 Enterprise  
**Fecha:** 25 de agosto de 2026  
**Estado:** ESPECIFICACIÓN CANÓNICA E IMPLEMENTACIÓN MAESTRA 🟢  

---

## 1. PRINCIPIO ARQUITECTÓNICO CENTRAL

La funcionalidad de **Cierre Diario de Efectivo de Motorizados** no crea un sistema contable paralelo; extiende de forma documental y operacional las estructuras contables certificadas en la Fase 1:

```
                            CADENA FINANCIERA CANÓNICA
                            
       /orders  &  /deliveryTrips
          │
          ▼ (onOrderDelivered / onTripCompleted)
   /courier_cash_ledger (Subledger inmutable de custodia de flota)
          │
          ▼ (FieldValue.increment)
   /courier_balances (Balance vivo del repartidor)
          │
          ▼ (initiateCourierDailyClosure)
   /courier_daily_closures (Cierre diario por fecha operacional)
          │
          ▼ (executeCourierSettlement)
   /courier_settlements (Arqueo físico y entrega en mesa)
          │
          ▼ (registerBankDepositReceipt)
    BANK DEPOSIT & COMPROBANTE (Firebase Storage + Metadatos)
          │
          ▼ (verifyCourierDailyClosure)
    ACTA OFICIAL DE CIERRE (Inmutable + Hash de Verificación + PDF)
          │
          ▼ (CourierCashControlModule.tsx)
    PANEL ADMIN: RECONCILIACIÓN DE 4 CAPAS
```

---

## 2. DIFERENCIACIÓN DE LOS TRES EVENTOS FINANCIEROS

1. **Arqueo (`COUNTED_CASH`):** ¿Cuánto dinero físico tiene el Courier al terminar su jornada versus lo esperado en el ledger?
2. **Entrega Física (`SETTLEMENT / CASH_HANDOVER`):** ¿Cuánto dinero entrega formalmente el Courier al supervisor en mesa?
3. **Depósito Bancario (`BANK_DEPOSIT`):** ¿Cuánto dinero fue efectivamente consignado en la cuenta bancaria de la empresa y acreditado con comprobante?

---

## 3. ESQUEMA DE DATOS CANÓNICO: `/courier_daily_closures/{closureId}`

```typescript
export interface CourierDailyClosure {
  closureId: string;                    // ID canónico (e.g. clos_20260825_uid123)
  closureOperationId: string;           // Clave de idempotencia única (cop_UUID)
  courierId: string;                    // UID del motorizado
  courierName: string;                  // Nombre del motorizado
  businessDate: string;                 // Fecha operacional (YYYY-MM-DD)
  shift?: "MORNING" | "AFTERNOON" | "FULL_DAY";
  
  // ─── Máquina de Estados ───
  status: 
    | "OPEN"
    | "CLOSURE_SUBMITTED"
    | "COUNTED"
    | "SETTLEMENT_CREATED"
    | "AWAITING_BANK_DEPOSIT"
    | "DEPOSIT_RECEIPT_UPLOADED"
    | "PENDING_ADMIN_VERIFICATION"
    | "VERIFIED"
    | "DISCREPANCY"
    | "REJECTED"
    | "REOPENED";

  // ─── Métricas de Recaudación (Desde courier_cash_ledger) ───
  expectedAmountCents: number;          // Monto total en centavos esperado del día
  ordersCount: number;                  // Cantidad de pedidos incluidos
  includedOrderIds: string[];           // IDs de órdenes vinculadas
  includedTripIds: string[];            // IDs de viajes X->Y vinculados
  
  // ─── Arqueo Físico (Settlement) ───
  countedAmountCents: number;           // Monto contado
  differenceCents: number;              // countedAmountCents - expectedAmountCents
  discrepancyAction: "NONE" | "CARRY_FORWARD" | "PAYROLL_DEDUCTION" | "ADMIN_WAIVE";
  settlementId?: string;                // Enlace a /courier_settlements/{settlementId}
  settledAt?: admin.firestore.Timestamp;

  // ─── Depósito Bancario ───
  bankDeposit?: {
    bankDepositId: string;
    bankName: string;                  // Ej: "BAC Credomatic", "Banco Lafise", "Banpro"
    accountReference: string;          // Número de cuenta
    bankReference: string;             // Número de transacción / Boucher
    depositDate: string;               // YYYY-MM-DD
    depositTime: string;               // HH:mm
    depositAmountCents: number;        // Monto depositado
    depositDiscrepancyCents: number;   // depositAmountCents - countedAmountCents
    receiptStoragePath: string;        // courier_closures/{courierId}/{closureId}/bank_receipt.jpg
    receiptDownloadUrl: string;        // URL de descarga
    receiptFileHash?: string;          // Hash SHA-256
    uploadedAt: admin.firestore.Timestamp;
    uploadedByUid: string;
    notes?: string;
  };

  // ─── Acta Oficial de Cierre ───
  officialAct?: {
    actNumber: string;                 // Ej: ACTA-CASH-20260825-C001
    issuedAt: admin.firestore.Timestamp;
    verificationCode: string;          // Hash de 8 caracteres
    supervisorUid?: string;
    supervisorName?: string;
    downloadUrl?: string;
  };

  // ─── Verificación Administrativa ───
  verifiedByUid?: string;
  verifiedByName?: string;
  verifiedAt?: admin.firestore.Timestamp;
  rejectionReason?: string;

  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
```

---

## 4. CONTRATOS DE CLOUD FUNCTIONS

### 4.1 `initiateCourierDailyClosure`
- **Propósito:** Inicia el cierre para una `businessDate`, obtiene los asientos del subledger correspondientes a esa fecha, congela el desglose de pedidos y crea el documento en `/courier_daily_closures`.
- **Idempotencia:** `closureOperationId`.

### 4.2 `registerBankDepositReceipt`
- **Propósito:** Registra los metadatos y la imagen de Firebase Storage del comprobante bancario. Valida la diferencia entre lo depositado y lo contado en el settlement (`depositDiscrepancyCents`).
- **Transición:** Cambia `status` a `DEPOSIT_RECEIPT_UPLOADED` / `PENDING_ADMIN_VERIFICATION`.

### 4.3 `verifyCourierDailyClosure`
- **Propósito:** Permite a un supervisor/administrador validar el cierre o rechazarlo con motivo formal. Al verificar, emite el `officialAct` inmutable.

---

## 5. REGLAS DE FIRESTORE Y STORAGE

### Firestore Rules (`firestore.rules`)
```javascript
match /courier_daily_closures/{closureId} {
  allow read: if isAuthenticated() && (
    currentUid() == resource.data.courierId ||
    isPlatformAdmin() ||
    isBusinessAdmin()
  );
  allow write: if false; // Solo Admin SDK vía Cloud Functions
}
```

### Storage Rules (`storage.rules`)
```javascript
match /courier_closures/{courierId}/{closureId}/{fileName} {
  allow read: if isAuthenticated() && (
    request.auth.uid == courierId ||
    isPlatformAdmin()
  );
  allow create: if isAuthenticated() &&
    request.auth.uid == courierId &&
    request.resource.size <= 10 * 1024 * 1024 &&
    request.resource.contentType.matches('image/(jpeg|png)|application/pdf');
  allow update, delete: if isPlatformAdmin();
}
```

---

## 6. MATRIZ DE RECONCILIACIÓN DE 4 CAPAS EN EL PANEL ADMIN

El módulo de Control de Efectivo permite auditar la cadena completa:

| Capa | Fuente | Concepto | Monto de Ejemplo | Estado |
|---|---|---|---|---|
| **Capa 1: Pedidos** | `/orders` & `/deliveryTrips` | Suma de órdenes cobradas en efectivo | C$ 4,850.00 | Entregados |
| **Capa 2: Subledger** | `/courier_cash_ledger` | Total acreditado en custodia | C$ 4,850.00 | `ORDER_CASH_COLLECTED` |
| **Capa 3: Settlement** | `/courier_settlements` | Efectivo contado en mesa | C$ 4,850.00 | `SETTLED` (Diff: 0) |
| **Capa 4: Depósito** | `/courier_daily_closures.bankDeposit` | Dinero acreditado en cuenta bancaria | C$ 4,850.00 | `MATCHED` (Voucher validado) |

---

## 7. MATRIZ DE PRUEBAS OBLIGATORIAS (16 CASOS DE CERTIFICACIÓN)

- **Test 1: Cierre exacto.** (Expected = Counted = Deposited = C$4,850 $\rightarrow$ `VERIFIED`).
- **Test 2: Cierre con faltante.** (Expected = C$5,430, Counted = C$5,380 $\rightarrow$ Diff = -C$50 $\rightarrow$ `CARRY_FORWARD`).
- **Test 3: Cierre duplicado.** (Mismo `closureOperationId` rechazado/idempotente).
- **Test 4: Settlement duplicado.** (Mismo `settlementOperationId` no duplica débito).
- **Test 5: Depósito exacto.** (Deposited = Counted $\rightarrow$ `depositDiscrepancy = 0`).
- **Test 6: Depósito diferente.** (Counted = C$4,850, Deposited = C$4,800 $\rightarrow$ `depositDiscrepancy = -C$50`).
- **Test 7: Sin comprobante.** (Estado permanece en `AWAITING_BANK_DEPOSIT`).
- **Test 8: Comprobante duplicado.** (Detección por hash de voucher).
- **Test 9: Aislamiento de Courier.** (Courier A no puede leer cierres de Courier B $\rightarrow$ `PERMISSION_DENIED`).
- **Test 10: Intento de modificación directa.** (Courier intenta actualizar cierre $\rightarrow$ `PERMISSION_DENIED`).
- **Test 11: Admin verifica cierre.** (Transición a `VERIFIED` + emisión de Acta Oficial).
- **Test 12: Admin rechaza cierre.** (Transición a `REJECTED` + registro de motivo en auditoría).
- **Test 13: Offline.** (Room Outbox almacena localmente y sincroniza al reconectar).
- **Test 14: Retry de conexión.** (No duplicación en cortes intermitentes).
- **Test 15: App cerrada durante subida.** (Estado `pendingMetadata` recuperable).
- **Test 16: Recalculación forense.** (`recalculateCourierBalance` reconstruye integridad total).
