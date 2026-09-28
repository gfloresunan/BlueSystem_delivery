/**
 * BlueSystem Delivery Enterprise — Domain Events Catalog
 * Sprint 17.2 Cloud Run & Event-Driven Messaging Foundation
 *
 * Contratos de eventos de dominio oficiales para desacoplamiento asíncrono vía Pub/Sub
 */

export interface BaseDomainEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  traceId: string;
  tenantId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
}

export interface OrderCreatedEvent extends BaseDomainEvent {
  eventType: "OrderCreated_v1";
  orderId: string;
  customerId: string;
  totalAmount: number;
  itemsCount: number;
  destinationAddress: {
    street: string;
    lat: number;
    lng: number;
  };
}

export interface OrderAcceptedEvent extends BaseDomainEvent {
  eventType: "OrderAccepted_v1";
  orderId: string;
  estimatedPreparationMinutes: number;
}

export interface OrderCancelledEvent extends BaseDomainEvent {
  eventType: "OrderCancelled_v1";
  orderId: string;
  cancelledBy: string;
  cancellationReason: string;
}

export interface DriverAssignedEvent extends BaseDomainEvent {
  eventType: "DriverAssigned_v1";
  orderId: string;
  driverId: string;
  driverName: string;
  vehicleType: string;
  etaMinutes: number;
}

export interface DriverArrivedEvent extends BaseDomainEvent {
  eventType: "DriverArrived_v1";
  orderId: string;
  driverId: string;
  arrivedAtLocation: "merchant" | "customer";
}

export interface PaymentVerifiedEvent extends BaseDomainEvent {
  eventType: "PaymentVerified_v1";
  orderId: string;
  paymentId: string;
  amountVerified: number;
  verifiedBy: string;
}

export interface PaymentFailedEvent extends BaseDomainEvent {
  eventType: "PaymentFailed_v1";
  orderId: string;
  reason: string;
}

export interface MerchantApprovedEvent extends BaseDomainEvent {
  eventType: "MerchantApproved_v1";
  businessId: string;
  approvedBy: string;
}
