import { DocumentUploadResult } from '../firebase';

export interface CourierPersonalInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  department: string;
  city: string;
  departmentId?: string;
  departmentName?: string;
  municipalityId?: string;
  municipalityName?: string;
  nationalId: string;
}

export interface CourierVehicleInfo {
  brand: string;
  model: string;
  plate: string;
  year?: string;
  color?: string;
}

export interface CourierDocumentsState {
  idFront: DocumentUploadResult | null;
  idBack: DocumentUploadResult | null;
  profilePhoto: DocumentUploadResult | null;
  registration: DocumentUploadResult | null;
  insurance: DocumentUploadResult | null;
  driverLicense: DocumentUploadResult | null;
}

export interface CourierFormData {
  personal: CourierPersonalInfo;
  vehicle: CourierVehicleInfo;
  documents: CourierDocumentsState;
}

