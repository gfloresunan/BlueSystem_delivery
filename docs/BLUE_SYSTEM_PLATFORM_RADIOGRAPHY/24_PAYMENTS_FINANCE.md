# 24 — PAYMENTS, SETTLEMENTS & FINANCE SPECIFICATION

**Domain:** Monetary Transactions & Financial Events  
**Collections:** `/financial_events`, `/merchant_summaries`, `/orders`

---

## 💰 1. Payment Methods & Reconciliation

BlueSystem Delivery Enterprise supports three payment modalities:
1. **Cash on Delivery (COD):** Customer pays courier in cash upon arrival. Driver enters exact cash received in `DeliveryCompletionDialog.kt`. System calculates driver cash balance debt owed to platform.
2. **Bank Transfer / Electronic Voucher:** Customer uploads receipt in `VoucherUploadDialog.kt`. Store or admin verifies before dispatch.
3. **Card Payment:** Integrated payment gateway tokens stored against the transaction record.

---

## 📊 2. Financial Ledger & Commission Settlement

When an order reaches `DELIVERED`, Cloud Function `onOrderDeliveredFinance` writes an immutable audit record:
```json
{
  "eventId": "fev_789456",
  "orderId": "ord_123456",
  "businessId": "biz_fritoni_group",
  "grossTotal": 350.00,
  "deliveryFee": 50.00,
  "platformCommission": 35.00,
  "netMerchantPayout": 265.00,
  "courierEarnings": 40.00,
  "paymentMethod": "CASH",
  "timestamp": "SERVER_TIMESTAMP"
}
```

---
*Evidence: inspection of `functions/src/domain/finance/` and `merchant-web/src/views/FinanceView.tsx`.*
