# C2D25E.4 — ECOSYSTEM DEPENDENCY MAP
## Protocol ID: `BSD-C2D25E4-MULTI-PLATFORM-CORE-FLUTTER-STRATEGY-AUDIT-001`

---

### 1. Mapa de Dependencias del Ecosistema

```mermaid
graph TD
    subgraph Multi-Platform Core [BlueSystem Core]
        CF[Cloud Functions]
        FS[(Firestore SSOT)]
        FA[Firebase Auth & EIAM]
        GK[Gatekeeper Engine]
        NW[Notification Worker APNs/Android]
        TM[Tenant/Brand/Subscription]
    end

    subgraph Clients [Client Touchpoints]
        ANC[Reference Android Native App - Kotlin]
        FAC[Flutter Android Client - Future]
        FIC[Flutter iOS Client - Future]
        WEB[Merchant & Admin Web Portals]
    end

    ANC -->|Reads/Writes| FS
    ANC -->|Invokes Callables| CF
    ANC -->|Auth Tokens| FA

    FAC -.->|Reads/Writes| FS
    FAC -.->|Invokes Callables| CF
    FAC -.->|Auth Tokens| FA

    FIC -.->|Reads/Writes| FS
    FIC -.->|Invokes Callables| CF
    FIC -.->|Auth Tokens| FA

    WEB -->|Reads/Writes| FS
    WEB -->|Invokes Callables| CF
    WEB -->|Auth Tokens| FA

    CF --> GK
    CF --> TM
    CF --> NW
```

---

### 2. Análisis de Dependencias Cruzadas
- **Core a Clientes:** CERO dependencias. El Core no importa ni invoca ningún módulo de cliente.
- **Clientes a Core:** Dependencia limpia y desacoplada a través de Firebase SDKs y Cloud Functions HTTPS Callables.
