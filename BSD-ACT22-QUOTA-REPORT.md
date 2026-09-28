# BSD-ACT22-QUOTA-REPORT
## Sistema de Cuotas y Límites Operacionales
**Protocol ID:** `BSD-ACT22-SUBSCRIPTION-FEATURE-MANAGER-001`  

---

### 1. Cuotas Canónicas Configurables (`SubscriptionQuotas`)

| Cuota | Starter | Professional | Enterprise | Custom | Unidad |
|---|:---:|:---:|:---:|:---:|---|
| `maxBusinesses` | 1 | 3 | $\infty$ (-1) | 10 | Comercios |
| `maxBranches` | 1 | 5 | $\infty$ (-1) | 20 | Sucursales |
| `maxUsers` | 3 | 15 | $\infty$ (-1) | 50 | Usuarios |
| `maxCouriers` | 2 | 10 | $\infty$ (-1) | 30 | Motorizados |
| `maxOrders` | 300 | 3,000 | $\infty$ (-1) | 10,000 | Pedidos/mes |
| `maxStorageMb` | 500 | 2,000 | 50,000 | 10,000 | MB |
| `maxApiRequests`| 1,000 | 10,000 | 1,000,000 | 50,000 | Requests/mes |

### 2. Convención Operacional
El valor `-1` representa cuota ilimitada contractual para niveles Enterprise.
