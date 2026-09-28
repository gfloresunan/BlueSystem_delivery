"use strict";
/**
 * BlueSystem Delivery Enterprise — Backend Cloud Functions (TypeScript Unificado)
 * EIAM v2.2, ADR-005 Modernization & Sprint 17.1 Infrastructure Foundation
 * Sprint 18.1: Merchant Onboarding Portal & EIAM Auto-Provisioning (ADR-011)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCourierProfileUpdateRequest = exports.submitCourierProfileUpdateRequest = exports.adminDeleteCourierApplication = exports.getCourierApplicationStatus = exports.submitCourierApplication = exports.getMerchantApplicationStatus = exports.completeMerchantWizard = exports.updateMerchantWizardStep = exports.submitMerchantApplication = exports.adminBackfillOrderCodes = exports.sendPushNotification = exports.adminDisableNotificationForUser = exports.adminDeleteCampaign = exports.deprovisionTenant = exports.sendFcmDiagnostic = exports.diagnoseFcmSystem = exports.reconcileMerchantIdentity = exports.adminUpdateUser = exports.syncExistingBusinesses = exports.onUserStoreWrite = exports.onCourierProfileRequestStatusChanged = exports.onCourierApplicationStatusChanged = exports.onCourierApplicationApproved = exports.onMerchantApplicationStatusChanged = exports.onMerchantApplicationApproved = exports.onBusinessLifecycleChanged = exports.setMembershipClaims = exports.setUserClaims = exports.COURIER_DEFAULT_CASH_LIMIT_CENTS = exports.COURIER_CASH_LIMIT_CENTS = exports.adminSetCourierCashLimit = exports.resolveEffectiveCashLimitCents = exports.evaluateCourierFinancialAccessInternal = exports.validateCourierOrderAcceptance = exports.getCourierFinancialAccessState = exports.generateOfficialClosureActPdf = exports.verifyCourierDailyClosure = exports.registerBankDepositReceipt = exports.initiateCourierDailyClosure = exports.recalculateCourierBalance = exports.executeCourierSettlement = exports.onTripPaymentVerified = exports.onTripCreated = exports.onTripCompleted = exports.onTripChatMessageCreated = exports.onOrderChatMessageCreated = exports.onOrderDelivered = exports.onPaymentStatusUpdated = exports.notifyOrderStatusChange = exports.notifyNewOrder = void 0;
exports.adminGetHeatmapData = exports.adminVerifySmtpConnection = exports.adminGetEmailEventsHistory = exports.adminSendTestEmail = exports.adminSaveEmailTemplate = exports.adminGetEmailTemplates = exports.processCustomerAIChat = exports.customerAIGateway = exports.calculateDeliveryRouteCallable = exports.deleteTenantDomain = exports.setPrimaryTenantDomain = exports.verifyTenantDomainDns = exports.registerTenantDomain = exports.BankGatewayAdapter = exports.DEFAULT_PAYMENT_ACTIVATION_STATUS = exports.validatePaymentRequest = exports.isCardPaymentAllowed = exports.evaluatePaymentActivationGate = exports.xToYDispatchScheduler = exports.aggregateTopSellingDaily = exports.healthCheckScheduler = exports.dashboardAggregatorScheduler = exports.notificationQueueScheduler = exports.notificationCleanupScheduler = exports.auditCleanupScheduler = exports.archiveOrdersScheduler = exports.adminManualPointsAdjustment = exports.adminSaveLoyaltyLevel = exports.adminListLoyaltyRewards = exports.adminDeleteLoyaltyReward = exports.adminSaveLoyaltyReward = exports.redeemLoyaltyReward = exports.adminRejectXToYTransfer = exports.adminVerifyXToYTransfer = exports.onXToYTripPaymentVerified = exports.onXToYTripCreated = exports.onOrderCompletedAwardLoyalty = exports.onNotificationCampaignUpdated = exports.onNotificationCampaignCreated = exports.createAuthoritativeOrder = exports.redeemCouponAtomic = exports.toggleCouponStatus = exports.createOrUpdateCoupon = exports.validateCouponCode = exports.adminApplyPermissionProposal = exports.adminParsePermissionIntent = exports.adminSetUserPermissionOverride = exports.adminGetUserEffectiveAccess = exports.adminGetRolesAndPermissions = exports.switchActiveTenantContext = void 0;
exports.getStaffInvitationDetails = exports.adminResendStaffInvitation = exports.acceptStaffInvitation = exports.authenticateWithStaffPin = exports.adminInviteStaffMember = exports.cancelDeliveryTrip = exports.submitOrderReview = exports.adminGetBusinessCategories = exports.adminSeedBusinessCategories = exports.adminToggleBusinessCategoryStatus = exports.adminSaveBusinessCategory = exports.adminBackfillHistoricalBusinessData = exports.adminRecalculateUnitsSold30d = exports.onOrderDeliveredForDashboard = exports.adminConfigureMerchantSettlement = exports.adminResolveSettlementDispute = exports.merchantDisputeSettlement = exports.merchantConfirmSettlement = exports.adminRecordSettlementPayment = exports.adminGeneratePreSettlement = exports.onSupportTicketMessageCreated = exports.onSupportTicketCreated = exports.sendCorporatePasswordReset = exports.sendCorporateEmailVerification = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
// ─── Triggers Firestore ───────────────────────────────────────────────────────
var orders_1 = require("./triggers/orders");
Object.defineProperty(exports, "notifyNewOrder", { enumerable: true, get: function () { return orders_1.notifyNewOrder; } });
Object.defineProperty(exports, "notifyOrderStatusChange", { enumerable: true, get: function () { return orders_1.notifyOrderStatusChange; } });
Object.defineProperty(exports, "onPaymentStatusUpdated", { enumerable: true, get: function () { return orders_1.onPaymentStatusUpdated; } });
Object.defineProperty(exports, "onOrderDelivered", { enumerable: true, get: function () { return orders_1.onOrderDelivered; } });
var orderChat_1 = require("./triggers/orderChat");
Object.defineProperty(exports, "onOrderChatMessageCreated", { enumerable: true, get: function () { return orderChat_1.onOrderChatMessageCreated; } });
var tripChat_1 = require("./triggers/tripChat");
Object.defineProperty(exports, "onTripChatMessageCreated", { enumerable: true, get: function () { return tripChat_1.onTripChatMessageCreated; } });
var trips_1 = require("./triggers/trips");
Object.defineProperty(exports, "onTripCompleted", { enumerable: true, get: function () { return trips_1.onTripCompleted; } });
var xToYDispatch_1 = require("./triggers/xToYDispatch");
Object.defineProperty(exports, "onTripCreated", { enumerable: true, get: function () { return xToYDispatch_1.onTripCreated; } });
Object.defineProperty(exports, "onTripPaymentVerified", { enumerable: true, get: function () { return xToYDispatch_1.onTripPaymentVerified; } });
var courierSettlement_1 = require("./callables/courierSettlement");
Object.defineProperty(exports, "executeCourierSettlement", { enumerable: true, get: function () { return courierSettlement_1.executeCourierSettlement; } });
Object.defineProperty(exports, "recalculateCourierBalance", { enumerable: true, get: function () { return courierSettlement_1.recalculateCourierBalance; } });
var courierClosureCallables_1 = require("./callables/courierClosureCallables");
Object.defineProperty(exports, "initiateCourierDailyClosure", { enumerable: true, get: function () { return courierClosureCallables_1.initiateCourierDailyClosure; } });
Object.defineProperty(exports, "registerBankDepositReceipt", { enumerable: true, get: function () { return courierClosureCallables_1.registerBankDepositReceipt; } });
Object.defineProperty(exports, "verifyCourierDailyClosure", { enumerable: true, get: function () { return courierClosureCallables_1.verifyCourierDailyClosure; } });
Object.defineProperty(exports, "generateOfficialClosureActPdf", { enumerable: true, get: function () { return courierClosureCallables_1.generateOfficialClosureActPdf; } });
var courierAccessPolicy_1 = require("./callables/courierAccessPolicy");
Object.defineProperty(exports, "getCourierFinancialAccessState", { enumerable: true, get: function () { return courierAccessPolicy_1.getCourierFinancialAccessState; } });
Object.defineProperty(exports, "validateCourierOrderAcceptance", { enumerable: true, get: function () { return courierAccessPolicy_1.validateCourierOrderAcceptance; } });
Object.defineProperty(exports, "evaluateCourierFinancialAccessInternal", { enumerable: true, get: function () { return courierAccessPolicy_1.evaluateCourierFinancialAccessInternal; } });
Object.defineProperty(exports, "resolveEffectiveCashLimitCents", { enumerable: true, get: function () { return courierAccessPolicy_1.resolveEffectiveCashLimitCents; } });
Object.defineProperty(exports, "adminSetCourierCashLimit", { enumerable: true, get: function () { return courierAccessPolicy_1.adminSetCourierCashLimit; } });
Object.defineProperty(exports, "COURIER_CASH_LIMIT_CENTS", { enumerable: true, get: function () { return courierAccessPolicy_1.COURIER_CASH_LIMIT_CENTS; } });
Object.defineProperty(exports, "COURIER_DEFAULT_CASH_LIMIT_CENTS", { enumerable: true, get: function () { return courierAccessPolicy_1.COURIER_DEFAULT_CASH_LIMIT_CENTS; } });
var auth_1 = require("./triggers/auth");
Object.defineProperty(exports, "setUserClaims", { enumerable: true, get: function () { return auth_1.setUserClaims; } });
Object.defineProperty(exports, "setMembershipClaims", { enumerable: true, get: function () { return auth_1.setMembershipClaims; } });
var merchantLifecycleSync_1 = require("./triggers/merchantLifecycleSync");
Object.defineProperty(exports, "onBusinessLifecycleChanged", { enumerable: true, get: function () { return merchantLifecycleSync_1.onBusinessLifecycleChanged; } });
var merchantApplications_1 = require("./triggers/merchantApplications");
Object.defineProperty(exports, "onMerchantApplicationApproved", { enumerable: true, get: function () { return merchantApplications_1.onMerchantApplicationApproved; } });
Object.defineProperty(exports, "onMerchantApplicationStatusChanged", { enumerable: true, get: function () { return merchantApplications_1.onMerchantApplicationStatusChanged; } });
var courierApplications_1 = require("./triggers/courierApplications");
Object.defineProperty(exports, "onCourierApplicationApproved", { enumerable: true, get: function () { return courierApplications_1.onCourierApplicationApproved; } });
Object.defineProperty(exports, "onCourierApplicationStatusChanged", { enumerable: true, get: function () { return courierApplications_1.onCourierApplicationStatusChanged; } });
var courierProfileRequests_1 = require("./triggers/courierProfileRequests");
Object.defineProperty(exports, "onCourierProfileRequestStatusChanged", { enumerable: true, get: function () { return courierProfileRequests_1.onCourierProfileRequestStatusChanged; } });
// ─── Business & Branch Public Projection Triggers ─────────────────────────────
var businessProjection_1 = require("./triggers/businessProjection");
Object.defineProperty(exports, "onUserStoreWrite", { enumerable: true, get: function () { return businessProjection_1.onUserStoreWrite; } });
Object.defineProperty(exports, "syncExistingBusinesses", { enumerable: true, get: function () { return businessProjection_1.syncExistingBusinesses; } });
// ─── Callables HTTPS ──────────────────────────────────────────────────────────
var admin_1 = require("./callables/admin");
Object.defineProperty(exports, "adminUpdateUser", { enumerable: true, get: function () { return admin_1.adminUpdateUser; } });
Object.defineProperty(exports, "reconcileMerchantIdentity", { enumerable: true, get: function () { return admin_1.reconcileMerchantIdentity; } });
Object.defineProperty(exports, "diagnoseFcmSystem", { enumerable: true, get: function () { return admin_1.diagnoseFcmSystem; } });
Object.defineProperty(exports, "sendFcmDiagnostic", { enumerable: true, get: function () { return admin_1.sendFcmDiagnostic; } });
Object.defineProperty(exports, "deprovisionTenant", { enumerable: true, get: function () { return admin_1.deprovisionTenant; } });
Object.defineProperty(exports, "adminDeleteCampaign", { enumerable: true, get: function () { return admin_1.adminDeleteCampaign; } });
Object.defineProperty(exports, "adminDisableNotificationForUser", { enumerable: true, get: function () { return admin_1.adminDisableNotificationForUser; } });
var notifications_1 = require("./callables/notifications");
Object.defineProperty(exports, "sendPushNotification", { enumerable: true, get: function () { return notifications_1.sendPushNotification; } });
var orderCodeBackfill_1 = require("./callables/orderCodeBackfill");
Object.defineProperty(exports, "adminBackfillOrderCodes", { enumerable: true, get: function () { return orderCodeBackfill_1.adminBackfillOrderCodes; } });
// ─── Sprint 18.1: Merchant Onboarding — Callables (ADR-011) ──────────────────
var merchant_1 = require("./callables/merchant");
Object.defineProperty(exports, "submitMerchantApplication", { enumerable: true, get: function () { return merchant_1.submitMerchantApplication; } });
Object.defineProperty(exports, "updateMerchantWizardStep", { enumerable: true, get: function () { return merchant_1.updateMerchantWizardStep; } });
Object.defineProperty(exports, "completeMerchantWizard", { enumerable: true, get: function () { return merchant_1.completeMerchantWizard; } });
Object.defineProperty(exports, "getMerchantApplicationStatus", { enumerable: true, get: function () { return merchant_1.getMerchantApplicationStatus; } });
// ─── Courier Onboarding & Verification Callables ──────────────────────────────
var courierOnboarding_1 = require("./callables/courierOnboarding");
Object.defineProperty(exports, "submitCourierApplication", { enumerable: true, get: function () { return courierOnboarding_1.submitCourierApplication; } });
Object.defineProperty(exports, "getCourierApplicationStatus", { enumerable: true, get: function () { return courierOnboarding_1.getCourierApplicationStatus; } });
Object.defineProperty(exports, "adminDeleteCourierApplication", { enumerable: true, get: function () { return courierOnboarding_1.adminDeleteCourierApplication; } });
var courierProfile_1 = require("./callables/courierProfile");
Object.defineProperty(exports, "submitCourierProfileUpdateRequest", { enumerable: true, get: function () { return courierProfile_1.submitCourierProfileUpdateRequest; } });
Object.defineProperty(exports, "reviewCourierProfileUpdateRequest", { enumerable: true, get: function () { return courierProfile_1.reviewCourierProfileUpdateRequest; } });
// ─── EIAM v3: Identity & Tenant Context Callables (Fase 2C.5) ─────────────────
var identity_1 = require("./callables/identity");
Object.defineProperty(exports, "switchActiveTenantContext", { enumerable: true, get: function () { return identity_1.switchActiveTenantContext; } });
// ─── RBAC & Roles/Permissions Control Center Callables ────────────────────────
var rbac_1 = require("./callables/rbac");
Object.defineProperty(exports, "adminGetRolesAndPermissions", { enumerable: true, get: function () { return rbac_1.adminGetRolesAndPermissions; } });
Object.defineProperty(exports, "adminGetUserEffectiveAccess", { enumerable: true, get: function () { return rbac_1.adminGetUserEffectiveAccess; } });
Object.defineProperty(exports, "adminSetUserPermissionOverride", { enumerable: true, get: function () { return rbac_1.adminSetUserPermissionOverride; } });
Object.defineProperty(exports, "adminParsePermissionIntent", { enumerable: true, get: function () { return rbac_1.adminParsePermissionIntent; } });
Object.defineProperty(exports, "adminApplyPermissionProposal", { enumerable: true, get: function () { return rbac_1.adminApplyPermissionProposal; } });
// ─── Enterprise Coupon Engine Callables (Fase Commerce Intelligence) ──────────
var coupons_1 = require("./callables/coupons");
Object.defineProperty(exports, "validateCouponCode", { enumerable: true, get: function () { return coupons_1.validateCouponCode; } });
Object.defineProperty(exports, "createOrUpdateCoupon", { enumerable: true, get: function () { return coupons_1.createOrUpdateCoupon; } });
Object.defineProperty(exports, "toggleCouponStatus", { enumerable: true, get: function () { return coupons_1.toggleCouponStatus; } });
Object.defineProperty(exports, "redeemCouponAtomic", { enumerable: true, get: function () { return coupons_1.redeemCouponAtomic; } });
Object.defineProperty(exports, "createAuthoritativeOrder", { enumerable: true, get: function () { return coupons_1.createAuthoritativeOrder; } });
var notificationQueue_1 = require("./triggers/notificationQueue");
Object.defineProperty(exports, "onNotificationCampaignCreated", { enumerable: true, get: function () { return notificationQueue_1.onNotificationCampaignCreated; } });
Object.defineProperty(exports, "onNotificationCampaignUpdated", { enumerable: true, get: function () { return notificationQueue_1.onNotificationCampaignUpdated; } });
// ─── Loyalty & Points Program (Triggers & Callables) ─────────────────────────
var loyalty_1 = require("./triggers/loyalty");
Object.defineProperty(exports, "onOrderCompletedAwardLoyalty", { enumerable: true, get: function () { return loyalty_1.onOrderCompletedAwardLoyalty; } });
var xToYDispatch_2 = require("./triggers/xToYDispatch");
Object.defineProperty(exports, "onXToYTripCreated", { enumerable: true, get: function () { return xToYDispatch_2.onTripCreated; } });
Object.defineProperty(exports, "onXToYTripPaymentVerified", { enumerable: true, get: function () { return xToYDispatch_2.onTripPaymentVerified; } });
var xToYAdmin_1 = require("./callables/xToYAdmin");
Object.defineProperty(exports, "adminVerifyXToYTransfer", { enumerable: true, get: function () { return xToYAdmin_1.adminVerifyXToYTransfer; } });
Object.defineProperty(exports, "adminRejectXToYTransfer", { enumerable: true, get: function () { return xToYAdmin_1.adminRejectXToYTransfer; } });
var loyaltyCallables_1 = require("./callables/loyaltyCallables");
Object.defineProperty(exports, "redeemLoyaltyReward", { enumerable: true, get: function () { return loyaltyCallables_1.redeemLoyaltyReward; } });
Object.defineProperty(exports, "adminSaveLoyaltyReward", { enumerable: true, get: function () { return loyaltyCallables_1.adminSaveLoyaltyReward; } });
Object.defineProperty(exports, "adminDeleteLoyaltyReward", { enumerable: true, get: function () { return loyaltyCallables_1.adminDeleteLoyaltyReward; } });
Object.defineProperty(exports, "adminListLoyaltyRewards", { enumerable: true, get: function () { return loyaltyCallables_1.adminListLoyaltyRewards; } });
Object.defineProperty(exports, "adminSaveLoyaltyLevel", { enumerable: true, get: function () { return loyaltyCallables_1.adminSaveLoyaltyLevel; } });
Object.defineProperty(exports, "adminManualPointsAdjustment", { enumerable: true, get: function () { return loyaltyCallables_1.adminManualPointsAdjustment; } });
// ─── Cloud Schedulers (Cron Tasks - Sprint 17.1) ──────────────────────────────
var archiveOrders_1 = require("./schedulers/archiveOrders");
Object.defineProperty(exports, "archiveOrdersScheduler", { enumerable: true, get: function () { return archiveOrders_1.archiveOrdersScheduler; } });
var auditCleanup_1 = require("./schedulers/auditCleanup");
Object.defineProperty(exports, "auditCleanupScheduler", { enumerable: true, get: function () { return auditCleanup_1.auditCleanupScheduler; } });
var notificationCleanup_1 = require("./schedulers/notificationCleanup");
Object.defineProperty(exports, "notificationCleanupScheduler", { enumerable: true, get: function () { return notificationCleanup_1.notificationCleanupScheduler; } });
var notificationQueue_2 = require("./schedulers/notificationQueue");
Object.defineProperty(exports, "notificationQueueScheduler", { enumerable: true, get: function () { return notificationQueue_2.notificationQueueScheduler; } });
var dashboardAggregator_1 = require("./schedulers/dashboardAggregator");
Object.defineProperty(exports, "dashboardAggregatorScheduler", { enumerable: true, get: function () { return dashboardAggregator_1.dashboardAggregatorScheduler; } });
var healthCheck_1 = require("./schedulers/healthCheck");
Object.defineProperty(exports, "healthCheckScheduler", { enumerable: true, get: function () { return healthCheck_1.healthCheckScheduler; } });
var topSellingScheduler_1 = require("./schedulers/topSellingScheduler");
Object.defineProperty(exports, "aggregateTopSellingDaily", { enumerable: true, get: function () { return topSellingScheduler_1.aggregateTopSellingDaily; } });
var xToYDispatchScheduler_1 = require("./schedulers/xToYDispatchScheduler");
Object.defineProperty(exports, "xToYDispatchScheduler", { enumerable: true, get: function () { return xToYDispatchScheduler_1.xToYDispatchScheduler; } });
// ─── Payment Hardening & Pre-Bank Certification (Phase 2 & Phase 3) ───────────
var paymentActivationGate_1 = require("./domain/payments/paymentActivationGate");
Object.defineProperty(exports, "evaluatePaymentActivationGate", { enumerable: true, get: function () { return paymentActivationGate_1.evaluatePaymentActivationGate; } });
Object.defineProperty(exports, "isCardPaymentAllowed", { enumerable: true, get: function () { return paymentActivationGate_1.isCardPaymentAllowed; } });
Object.defineProperty(exports, "validatePaymentRequest", { enumerable: true, get: function () { return paymentActivationGate_1.validatePaymentRequest; } });
Object.defineProperty(exports, "DEFAULT_PAYMENT_ACTIVATION_STATUS", { enumerable: true, get: function () { return paymentActivationGate_1.DEFAULT_PAYMENT_ACTIVATION_STATUS; } });
var BankGatewayAdapter_1 = require("./domain/payments/adapters/BankGatewayAdapter");
Object.defineProperty(exports, "BankGatewayAdapter", { enumerable: true, get: function () { return BankGatewayAdapter_1.BankGatewayAdapter; } });
// ─── Phase 2E: Enterprise Multi-Tenant Domain Management Callables ───────────
var domainManagement_1 = require("./callables/domainManagement");
Object.defineProperty(exports, "registerTenantDomain", { enumerable: true, get: function () { return domainManagement_1.registerTenantDomain; } });
Object.defineProperty(exports, "verifyTenantDomainDns", { enumerable: true, get: function () { return domainManagement_1.verifyTenantDomainDns; } });
Object.defineProperty(exports, "setPrimaryTenantDomain", { enumerable: true, get: function () { return domainManagement_1.setPrimaryTenantDomain; } });
Object.defineProperty(exports, "deleteTenantDomain", { enumerable: true, get: function () { return domainManagement_1.deleteTenantDomain; } });
// ─── Actividad #16: Rutas Reales y Cálculo de Distancia Real (BSDEL-C16-REAL-ROUTING) ─
var calculateDeliveryRoute_1 = require("./callables/calculateDeliveryRoute");
Object.defineProperty(exports, "calculateDeliveryRouteCallable", { enumerable: true, get: function () { return calculateDeliveryRoute_1.calculateDeliveryRouteCallable; } });
// ─── Phase C3-C / C3-D: BlueSystem AI Backend Gateway (BSD-AI-C3D-CONFIRMATION-GATE-GEMINI-RUNTIME-FOUNDATION) ─
var SecureAIGateway_1 = require("./ai/SecureAIGateway");
Object.defineProperty(exports, "customerAIGateway", { enumerable: true, get: function () { return SecureAIGateway_1.customerAIGateway; } });
Object.defineProperty(exports, "processCustomerAIChat", { enumerable: true, get: function () { return SecureAIGateway_1.processCustomerAIChat; } });
// ─── Actividad #20: Sistema de Email Transaccional Enterprise & SMTP Corporativo ─
var emailTemplates_1 = require("./callables/emailTemplates");
Object.defineProperty(exports, "adminGetEmailTemplates", { enumerable: true, get: function () { return emailTemplates_1.adminGetEmailTemplates; } });
Object.defineProperty(exports, "adminSaveEmailTemplate", { enumerable: true, get: function () { return emailTemplates_1.adminSaveEmailTemplate; } });
Object.defineProperty(exports, "adminSendTestEmail", { enumerable: true, get: function () { return emailTemplates_1.adminSendTestEmail; } });
Object.defineProperty(exports, "adminGetEmailEventsHistory", { enumerable: true, get: function () { return emailTemplates_1.adminGetEmailEventsHistory; } });
Object.defineProperty(exports, "adminVerifySmtpConnection", { enumerable: true, get: function () { return emailTemplates_1.adminVerifySmtpConnection; } });
// ─── Actividad #8: Zonas Calientes / Heatmap de Demanda Multi-Tenant ──────────
var heatmapAnalytics_1 = require("./callables/heatmapAnalytics");
Object.defineProperty(exports, "adminGetHeatmapData", { enumerable: true, get: function () { return heatmapAnalytics_1.adminGetHeatmapData; } });
// ─── Customer Profile & Support Tickets Enterprise ────────────────────────────
var authVerification_1 = require("./callables/authVerification");
Object.defineProperty(exports, "sendCorporateEmailVerification", { enumerable: true, get: function () { return authVerification_1.sendCorporateEmailVerification; } });
Object.defineProperty(exports, "sendCorporatePasswordReset", { enumerable: true, get: function () { return authVerification_1.sendCorporatePasswordReset; } });
var supportTickets_1 = require("./triggers/supportTickets");
Object.defineProperty(exports, "onSupportTicketCreated", { enumerable: true, get: function () { return supportTickets_1.onSupportTicketCreated; } });
Object.defineProperty(exports, "onSupportTicketMessageCreated", { enumerable: true, get: function () { return supportTickets_1.onSupportTicketMessageCreated; } });
// ─── BSD-FINANCE-MERCHANT-SETTLEMENT-001: Liquidación Financiera por Comercio ───
var merchantSettlement_1 = require("./callables/merchantSettlement");
Object.defineProperty(exports, "adminGeneratePreSettlement", { enumerable: true, get: function () { return merchantSettlement_1.adminGeneratePreSettlement; } });
Object.defineProperty(exports, "adminRecordSettlementPayment", { enumerable: true, get: function () { return merchantSettlement_1.adminRecordSettlementPayment; } });
Object.defineProperty(exports, "merchantConfirmSettlement", { enumerable: true, get: function () { return merchantSettlement_1.merchantConfirmSettlement; } });
Object.defineProperty(exports, "merchantDisputeSettlement", { enumerable: true, get: function () { return merchantSettlement_1.merchantDisputeSettlement; } });
Object.defineProperty(exports, "adminResolveSettlementDispute", { enumerable: true, get: function () { return merchantSettlement_1.adminResolveSettlementDispute; } });
Object.defineProperty(exports, "adminConfigureMerchantSettlement", { enumerable: true, get: function () { return merchantSettlement_1.adminConfigureMerchantSettlement; } });
// ─── BSD-C2D-CUSTOMER-DASHBOARD-IMPLEMENTATION-001: Aggregation & Backfill ───
var dashboardAggregation_1 = require("./triggers/dashboardAggregation");
Object.defineProperty(exports, "onOrderDeliveredForDashboard", { enumerable: true, get: function () { return dashboardAggregation_1.onOrderDeliveredForDashboard; } });
Object.defineProperty(exports, "adminRecalculateUnitsSold30d", { enumerable: true, get: function () { return dashboardAggregation_1.adminRecalculateUnitsSold30d; } });
Object.defineProperty(exports, "adminBackfillHistoricalBusinessData", { enumerable: true, get: function () { return dashboardAggregation_1.adminBackfillHistoricalBusinessData; } });
// ─── SD-ADMIN-BUSINESS-CATEGORIES-001: Global Platform Master Callables ───────
var businessCategories_1 = require("./callables/businessCategories");
Object.defineProperty(exports, "adminSaveBusinessCategory", { enumerable: true, get: function () { return businessCategories_1.adminSaveBusinessCategory; } });
Object.defineProperty(exports, "adminToggleBusinessCategoryStatus", { enumerable: true, get: function () { return businessCategories_1.adminToggleBusinessCategoryStatus; } });
Object.defineProperty(exports, "adminSeedBusinessCategories", { enumerable: true, get: function () { return businessCategories_1.adminSeedBusinessCategories; } });
Object.defineProperty(exports, "adminGetBusinessCategories", { enumerable: true, get: function () { return businessCategories_1.adminGetBusinessCategories; } });
// ─── BSD-ORDER-CLOSURE-RATING-QUIRURGICAL-FIX-001: Review & Ratings Core ───────
var reviews_1 = require("./callables/reviews");
Object.defineProperty(exports, "submitOrderReview", { enumerable: true, get: function () { return reviews_1.submitOrderReview; } });
// ─── BSD-X2Y-CANCELLATION-RATING-COURIER-TRIP-METRICS-UX-001: Delivery Express X→Y Cancel ───
var cancelDeliveryTrip_1 = require("./callables/cancelDeliveryTrip");
Object.defineProperty(exports, "cancelDeliveryTrip", { enumerable: true, get: function () { return cancelDeliveryTrip_1.cancelDeliveryTrip; } });
// ─── BSD-MERCHANT-STAFF-AUTH-LIFECYCLE-001: Staff Auth & PIN Lifecycle ────────
var staffAuth_1 = require("./callables/staffAuth");
Object.defineProperty(exports, "adminInviteStaffMember", { enumerable: true, get: function () { return staffAuth_1.adminInviteStaffMember; } });
Object.defineProperty(exports, "authenticateWithStaffPin", { enumerable: true, get: function () { return staffAuth_1.authenticateWithStaffPin; } });
Object.defineProperty(exports, "acceptStaffInvitation", { enumerable: true, get: function () { return staffAuth_1.acceptStaffInvitation; } });
Object.defineProperty(exports, "adminResendStaffInvitation", { enumerable: true, get: function () { return staffAuth_1.adminResendStaffInvitation; } });
Object.defineProperty(exports, "getStaffInvitationDetails", { enumerable: true, get: function () { return staffAuth_1.getStaffInvitationDetails; } });
//# sourceMappingURL=index.js.map