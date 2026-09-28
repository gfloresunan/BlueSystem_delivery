export type EiamRole = 'OWNER' | 'MANAGER' | 'SUPERVISOR' | 'CASHIER' | 'COOK';

export interface MerchantUser {
  uid: String;
  email: String;
  displayName: String;
  role: EiamRole;
  businessId: String;
  branchId?: String;
}

export interface BusinessInfo {
  businessId: String;
  name: String;
  logoUrl?: String;
  primaryBranchId: String;
  isOpen: boolean;
}

export interface OrderItem {
  id: String;
  productName: String;
  quantity: number;
  price: number;
}

export interface OrderDTO {
  id: String;
  orderNumber: String;
  customerName: String;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  items: OrderItem[];
  total: number;
  createdAt: String;
  estimatedDeliveryTime?: String;
  driverName?: String;
}
