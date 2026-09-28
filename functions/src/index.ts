/**
 * BlueSystem Delivery Enterprise — Backend Cloud Functions (TypeScript Unificado)
 * EIAM v2.2, ADR-005 Modernization & Sprint 17.1 Infrastructure Foundation
 * Sprint 18.1: Merchant Onboarding Portal & EIAM Auto-Provisioning (ADR-011)
 */

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

// ─── Triggers Firestore ───────────────────────────────────────────────────────
export {
  notifyNewOrder,
  notifyOrderStatusChange,
  onPaymentStatusUpdated,
  onOrderDelivered,
} from "./triggers/orders";

export {
  onOrderChatMessageCreated,
} from "./triggers/orderChat";

export {
  onTripChatMessageCreated,
} from "./triggers/tripChat";

export {
  onTripCompleted,
} from "./triggers/trips";

export {
  onTripCreated,
  onTripPaymentVerified,
} from "./triggers/xToYDispatch";

export {
  executeCourierSettlement,
  recalculateCourierBalance,
} from "./callables/courierSettlement";

export {
  initiateCourierDailyClosure,
  registerBankDepositReceipt,
  verifyCourierDailyClosure,
  generateOfficialClosureActPdf,
} from "./callables/courierClosureCallables";

export {
  getCourierFinancialAccessState,
  validateCourierOrderAcceptance,
  evaluateCourierFinancialAccessInternal,
  resolveEffectiveCashLimitCents,
  adminSetCourierCashLimit,
  COURIER_CASH_LIMIT_CENTS,
  COURIER_DEFAULT_CASH_LIMIT_CENTS,
} from "./callables/courierAccessPolicy";


export {
  setUserClaims,
  setMembershipClaims,
} from "./triggers/auth";

export {
  onBusinessLifecycleChanged,
} from "./triggers/merchantLifecycleSync";

export {
  onMerchantApplicationApproved,
  onMerchantApplicationStatusChanged,
} from "./triggers/merchantApplications";

export {
  onCourierApplicationApproved,
  onCourierApplicationStatusChanged,
} from "./triggers/courierApplications";

export {
  onCourierProfileRequestStatusChanged,
} from "./triggers/courierProfileRequests";

// ─── Business & Branch Public Projection Triggers ─────────────────────────────
export {
  onUserStoreWrite,
  syncExistingBusinesses,
} from "./triggers/businessProjection";

// ─── Callables HTTPS ──────────────────────────────────────────────────────────
export {
  adminUpdateUser,
  reconcileMerchantIdentity,
  diagnoseFcmSystem,
  sendFcmDiagnostic,
  deprovisionTenant,
  adminDeleteCampaign,
  adminDisableNotificationForUser,
} from "./callables/admin";

export {
  sendPushNotification,
} from "./callables/notifications";

export {
  adminBackfillOrderCodes,
} from "./callables/orderCodeBackfill";

// ─── Sprint 18.1: Merchant Onboarding — Callables (ADR-011) ──────────────────
export {
  submitMerchantApplication,
  updateMerchantWizardStep,
  completeMerchantWizard,
  getMerchantApplicationStatus,
} from "./callables/merchant";

// ─── Courier Onboarding & Verification Callables ──────────────────────────────
export {
  submitCourierApplication,
  getCourierApplicationStatus,
  adminDeleteCourierApplication,
} from "./callables/courierOnboarding";

export {
  submitCourierProfileUpdateRequest,
  reviewCourierProfileUpdateRequest,
} from "./callables/courierProfile";

// ─── EIAM v3: Identity & Tenant Context Callables (Fase 2C.5) ─────────────────
export {
  switchActiveTenantContext,
} from "./callables/identity";

// ─── RBAC & Roles/Permissions Control Center Callables ────────────────────────
export {
  adminGetRolesAndPermissions,
  adminGetUserEffectiveAccess,
  adminSetUserPermissionOverride,
  adminParsePermissionIntent,
  adminApplyPermissionProposal,
} from "./callables/rbac";

// ─── Enterprise Coupon Engine Callables (Fase Commerce Intelligence) ──────────
export {
  validateCouponCode,
  createOrUpdateCoupon,
  toggleCouponStatus,
  redeemCouponAtomic,
  createAuthoritativeOrder,
} from "./callables/coupons";

export {
  onNotificationCampaignCreated,
  onNotificationCampaignUpdated,
} from "./triggers/notificationQueue";

// ─── Loyalty & Points Program (Triggers & Callables) ─────────────────────────
export {
  onOrderCompletedAwardLoyalty,
} from "./triggers/loyalty";

export {
  onTripCreated as onXToYTripCreated,
  onTripPaymentVerified as onXToYTripPaymentVerified,
} from "./triggers/xToYDispatch";

export {
  adminVerifyXToYTransfer,
  adminRejectXToYTransfer,
} from "./callables/xToYAdmin";

export {
  redeemLoyaltyReward,
  adminSaveLoyaltyReward,
  adminDeleteLoyaltyReward,
  adminListLoyaltyRewards,
  adminSaveLoyaltyLevel,
  adminManualPointsAdjustment,
} from "./callables/loyaltyCallables";

// ─── Cloud Schedulers (Cron Tasks - Sprint 17.1) ──────────────────────────────
export { archiveOrdersScheduler } from "./schedulers/archiveOrders";
export { auditCleanupScheduler } from "./schedulers/auditCleanup";
export { notificationCleanupScheduler } from "./schedulers/notificationCleanup";
export { notificationQueueScheduler } from "./schedulers/notificationQueue";
export { dashboardAggregatorScheduler } from "./schedulers/dashboardAggregator";
export { healthCheckScheduler } from "./schedulers/healthCheck";
export { aggregateTopSellingDaily } from "./schedulers/topSellingScheduler";
export { xToYDispatchScheduler } from "./schedulers/xToYDispatchScheduler";

// ─── Payment Hardening & Pre-Bank Certification (Phase 2 & Phase 3) ───────────
export {
  evaluatePaymentActivationGate,
  isCardPaymentAllowed,
  validatePaymentRequest,
  DEFAULT_PAYMENT_ACTIVATION_STATUS,
} from "./domain/payments/paymentActivationGate";
export {
  PaymentGatewayPort,
  CreatePaymentIntentRequest,
  PaymentIntentResult,
  AuthorizePaymentRequest,
  AuthorizePaymentResult,
  CapturePaymentRequest,
  CapturePaymentResult,
  VoidPaymentRequest,
  VoidPaymentResult,
  RefundPaymentRequest,
  RefundPaymentResult,
  PaymentStatusResult,
  WebhookVerificationRequest,
  WebhookVerificationResult,
} from "./domain/payments/PaymentGatewayPort";
export { BankGatewayAdapter, BankGatewayConfig } from "./domain/payments/adapters/BankGatewayAdapter";

// ─── Phase 2E: Enterprise Multi-Tenant Domain Management Callables ───────────
export {
  registerTenantDomain,
  verifyTenantDomainDns,
  setPrimaryTenantDomain,
  deleteTenantDomain,
} from "./callables/domainManagement";

// ─── Actividad #16: Rutas Reales y Cálculo de Distancia Real (BSDEL-C16-REAL-ROUTING) ─
export {
  calculateDeliveryRouteCallable,
} from "./callables/calculateDeliveryRoute";

// ─── Phase C3-C / C3-D: BlueSystem AI Backend Gateway (BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION) ─
export {
  customerAIGateway,
  processCustomerAIChat,
} from "./ai/SecureAIGateway";

// ─── Actividad #20: Sistema de Email Transaccional Enterprise & SMTP Corporativo ─
export {
  adminGetEmailTemplates,
  adminSaveEmailTemplate,
  adminSendTestEmail,
  adminGetEmailEventsHistory,
  adminVerifySmtpConnection,
} from "./callables/emailTemplates";

// ─── Actividad #8: Zonas Calientes / Heatmap de Demanda Multi-Tenant ──────────
export {
  adminGetHeatmapData,
} from "./callables/heatmapAnalytics";

// ─── Customer Profile & Support Tickets Enterprise ────────────────────────────
export {
  sendCorporateEmailVerification,
  sendCorporatePasswordReset,
} from "./callables/authVerification";

export {
  onSupportTicketCreated,
  onSupportTicketMessageCreated,
} from "./triggers/supportTickets";

// ─── BSD-FINANCE-MERCHANT-SETTLEMENT-001: Liquidación Financiera por Comercio ───
export {
  adminGeneratePreSettlement,
  adminRecordSettlementPayment,
  merchantConfirmSettlement,
  merchantDisputeSettlement,
  adminResolveSettlementDispute,
  adminConfigureMerchantSettlement,
} from "./callables/merchantSettlement";

// ─── BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001: Aggregation & Backfill ───
export {
  onOrderDeliveredForDashboard,
  adminRecalculateUnitsSold30d,
  adminBackfillHistoricalBusinessData,
} from "./triggers/dashboardAggregation";

// ─── SD-ADMIN-BUSINESS-CATEGORIES-001: Global Platform Master Callables ───────
export {
  adminSaveBusinessCategory,
  adminToggleBusinessCategoryStatus,
  adminSeedBusinessCategories,
  adminGetBusinessCategories,
} from "./callables/businessCategories";

// ─── BSD-ORDER-CLOSURE-RATING-QUIRURGICAL-FIX-001: Review & Ratings Core ───────
export {
  submitOrderReview,
} from "./callables/reviews";

// ─── BSD-X2Y-CANCELLATION-RATING-COURIER-TRIP-METRICS-UX-001: Delivery Express X→Y Cancel ───
export {
  cancelDeliveryTrip,
} from "./callables/cancelDeliveryTrip";

// ─── BSD-MERCHANT-STAFF-AUTH-LIFECYCLE-001: Staff Auth & PIN Lifecycle ────────
export {
  adminInviteStaffMember,
  authenticateWithStaffPin,
  acceptStaffInvitation,
  adminResendStaffInvitation,
  getStaffInvitationDetails,
} from "./callables/staffAuth";



