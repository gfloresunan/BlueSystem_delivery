export type MerchantApplicationStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'DOCS_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ONBOARDING'
  | 'ACTIVE';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface MerchantFormData {
  applicationId: string;
  tenantId?: string;
  tenantSlug?: string;

  // Step 1: General Info
  businessName: string;
  legalName: string;
  ruc: string;
  category: string;
  businessCategoryId?: string;
  
  // Step 2: Location & Contact
  departmentId: string;
  departmentName?: string;
  municipalityId: string;
  municipalityName?: string;
  address: string;
  city: string;
  zone: string;
  contactName: string;
  phone: string;
  email: string;
  location: LocationCoordinates;
  
  // Step 3: Documents
  documentFiles: Array<{
    name: string;
    type: 'RUC' | 'SANITY_PERMIT' | 'ID_CARD' | 'OTHER';
    storagePath?: string;
    contentType?: string;
    size?: number;
    uploadedAt?: string;
    progress?: number;
    status: 'uploading' | 'completed' | 'error';
  }>;

  // Additional
  acceptTerms: boolean;
}

export interface ApplicationStatusResult {
  applicationId: string;
  businessName: string;
  status: MerchantApplicationStatus;
  createdAt: any;
  updatedAt: any;
  statusMessage: string;
  docsNote?: string | null;
  rejectionReason?: string | null;
}
