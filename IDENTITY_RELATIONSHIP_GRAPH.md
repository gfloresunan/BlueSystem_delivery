# FASE H — GRAFO LOGICO DE RELACIONES DE IDENTIDAD

```mermaid
graph TD
    subgraph EIAM_CORE["EIAM Core Identity Layer (/users)"]
        U_ADMIN["Admin / SuperAdmin (2)"]
        U_BIZ["Business Owners (5)"]
        U_COUR["Courier Motorizado (1)"]
        U_CUST["Customers / Clientes (19)"]
        U_SELL["Sellers POS (2)"]
        U_LEGACY["Legacy POS Clients (9)"]
        U_INC["Incomplete Docs (3)"]
    end

    subgraph ORGANIZATIONAL["Organizational Domain"]
        ORG["/organizations (2)"]
        BIZ["/businesses (9)"]
        BRANCH["/branches (6)"]
        MEMB["/membership (2)"]
        MA["/merchant_applications (4)"]
    end

    subgraph MOBILE_HARDWARE["Mobile & FCM Domain"]
        DEV["/user_devices (16)"]
    end

    subgraph OPERATIONAL["Operational & Financial Domain"]
        PAY["/payments (211)"]
        SALES["/sales (356)"]
        ORDERS["/orders (3)"]
        AUDIT["/audit_events (9)"]
        NOTIF["/notifications (11)"]
    end

    U_BIZ --> BIZ
    U_BIZ --> ORG
    BIZ --> BRANCH
    U_BIZ --> MEMB
    MA --> BIZ

    U_ADMIN --> AUDIT
    U_BIZ --> SALES
    U_BIZ --> PAY
    U_CUST --> ORDERS
    U_CUST --> PAY
    U_COUR --> ORDERS

    U_CUST --> DEV
    U_BIZ --> DEV
    U_COUR --> DEV

    U_LEGACY -. "Posible vinculación cliente" .-> U_CUST
```

---

## Detalle de Conectividad por Dominio

1. **Dominio Organizacional (EIAM):** 5 identidades Business se conectan con 9 Comercios (`/businesses`), 6 Sucursales (`/branches`), 2 Organizaciones (`/organizations`) y 2 Membresías (`/membership`).
2. **Dominio Operativo y Financiero:** Se encontraron 356 ventas (`/sales`), 211 pagos (`/payments`), 3 pedidos (`/orders`), 9 eventos de auditoría (`/audit_events`) y 11 notificaciones (`/notifications`).
3. **Dominio Móvil / Dispositivos:** 16 dispositivos en `/user_devices` proveen FCM tokens y metadata de hardware para las identidades activas.
