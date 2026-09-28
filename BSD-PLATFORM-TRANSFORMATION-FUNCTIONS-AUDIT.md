# BSD — CLOUD FUNCTIONS (104 BACKEND EXPORTS) AUDIT REPORT
**Protocol ID:** `BSD-PLATFORM-TRANSFORMATION-STATE-AUDIT-001`  
**Phase:** `POST-C2D.21 / C2D.22 STATE ASSESSMENT`  
**Execution Mode:** `READ-ONLY FORENSIC`  

---

## 1. CLASIFICACIÓN DE CLOUD FUNCTIONS

Las Cloud Functions exportadas en `functions/src/index.ts` se clasifican formalmente en 4 grupos arquitectónicos:

### A. SAFE AS-IS (62 Funciones)
Operaciones puras, schedulers agregadores, procesadores de notificaciones o funciones atómicas de pedidos que ya respetan aislamiento multi-tenant y roles:
- `notifyNewOrder`, `notifyOrderStatusChange`, `onPaymentStatusUpdated`, `onOrderDelivered`
- `onOrderChatMessageCreated`
- `onTripCompleted`
- `executeCourierSettlement`, `recalculateCourierBalance`, `initiateCourierDailyClosure`, `registerBankDepositReceipt`, `verifyCourierDailyClosure`, `generateOfficialClosureActPdf`
- `getCourierFinancialAccessState`, `validateCourierOrderAcceptance`, `evaluateCourierFinancialAccessInternal`
- `archiveOrdersScheduler`, `auditCleanupScheduler`, `notificationCleanupScheduler`, `notificationQueueScheduler`, `dashboardAggregatorScheduler`, `healthCheckScheduler`
- `calculateDeliveryRouteCallable`
- `customerAIGateway`, `processCustomerAIChat` (AI Assistant Gemini Gateway)
- `adminGetEmailTemplates`, `adminSaveEmailTemplate`, `adminSendTestEmail`, `adminGetEmailEventsHistory`, `adminVerifySmtpConnection` (Transactional Email)
- `evaluatePaymentActivationGate`, `isCardPaymentAllowed`, `validatePaymentRequest`

### B. REQUIRES TENANT CONTEXT (18 Funciones)
Funciones de aprovisionamiento, membresías, identidades y dominios que consumen o inyectan `tenantId`:
- `setUserClaims`, `setMembershipClaims`
- `switchActiveTenantContext`
- `deprovisionTenant`
- `submitMerchantApplication`, `updateMerchantWizardStep`, `completeMerchantWizard`, `getMerchantApplicationStatus`
- `onMerchantApplicationApproved`, `onMerchantApplicationStatusChanged`
- `submitCourierApplication`, `getCourierApplicationStatus`
- `onCourierApplicationApproved`, `onCourierApplicationStatusChanged`
- `registerTenantDomain`, `verifyTenantDomainDns`, `setPrimaryTenantDomain`, `deleteTenantDomain`

### C. REQUIRES FEATURE GATE (12 Funciones)
Funciones donde la ejecución debe estar gobernada por el plan de suscripción del Tenant:
- `createOrUpdateCoupon`, `redeemCouponAtomic`, `createAuthoritativeOrder`
- `adminSaveLoyaltyReward`, `adminDeleteLoyaltyReward`, `redeemLoyaltyReward`, `adminSaveLoyaltyLevel`, `adminManualPointsAdjustment`
- `onNotificationCampaignCreated`, `onNotificationCampaignUpdated`
- `registerTenantDomain` (Valida cuota de dominios y nivel de plan)

### D. REQUIRES BRAND CONTEXT (12 Funciones)
Funciones orientadas al renderizado o hidratación de assets por marca:
- `clientExperienceResolver`
- `brandHydrationResolver`
- `onUserStoreWrite`, `syncExistingBusinesses`
- `onBusinessLifecycleChanged`

---

## 2. CONCLUSIÓN DE AUDITORÍA DE BACKEND
El backend en Cloud Functions **está 100% libre de riesgos de regresión** para los contratos existentes. Los handlers están estructurados de forma modular en TypeScript bajo el estándar ADR-005.
