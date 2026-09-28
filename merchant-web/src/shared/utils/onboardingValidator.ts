/**
 * BlueSystem Delivery Enterprise — Merchant Onboarding Validator
 * Evaluador central de completitud y requisitos de activación del comercio
 */

import { isValidMunicipality } from '../constants/geoCatalog';

export interface WizardState {
  businessName: string;
  category: string;
  phone: string;
  email: string;
  description: string;

  logoUrl: string;
  coverUrl: string;

  branchName: string;
  departmentId?: string;
  departmentName?: string;
  municipalityId?: string;
  municipalityName?: string;
  city: string;
  zone: string;
  address: string;
  latitude: number;
  longitude: number;
  coverageRadiusKm: number;

  schedule: Record<string, { open: string; close: string; isOpen: boolean }>;

  deliveryFee: number;
  maxDeliveryRadiusKm: number;
  kitchenPrepTimeMinutes: number;

  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountType: string;
  acceptedPayments: string[];

  categoryName: string;
  productName: string;
  productPrice: number;
  productDescription: string;
  productImageUrl: string;
}

export interface ValidationSectionResult {
  isComplete: boolean;
  message?: string;
}

export interface OnboardingValidationReport {
  complete: boolean;
  completionPercentage: number;
  sections: {
    profile: ValidationSectionResult;
    branding: ValidationSectionResult;
    branch: ValidationSectionResult;
    hours: ValidationSectionResult;
    delivery: ValidationSectionResult;
    finance: ValidationSectionResult;
    menu: ValidationSectionResult;
    products: ValidationSectionResult;
  };
}

export function validateMerchantOnboarding(data: WizardState): OnboardingValidationReport {
  // 1. Profile section
  const profileComplete = Boolean(
    data.businessName?.trim() &&
    data.phone?.trim() &&
    data.category?.trim()
  );

  // 2. Branding section (recomended or required)
  const brandingComplete = Boolean(
    data.logoUrl?.trim() || data.coverUrl?.trim()
  );

  // 3. Branch section (Ubicación Geográfica Estructurada + Coordenadas GPS)
  const isGeoValid = isValidMunicipality(data.departmentId, data.municipalityId);
  const branchComplete = Boolean(
    isGeoValid &&
    data.address?.trim() &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number'
  );

  // 4. Hours section (at least 1 day with schedule)
  const hasValidSchedule = Object.values(data.schedule || {}).some(
    (day) => day.isOpen || (Boolean(day.open) && Boolean(day.close))
  );

  // 5. Delivery section
  const deliveryComplete = Boolean(
    data.deliveryFee >= 0 &&
    data.maxDeliveryRadiusKm > 0
  );

  // 6. Finance section
  const financeComplete = Boolean(
    data.bankName?.trim() &&
    data.accountNumber?.trim() &&
    data.accountHolder?.trim()
  );

  // 7. Menu section
  const menuComplete = Boolean(
    data.categoryName?.trim()
  );

  // 8. Products section
  const productsComplete = Boolean(
    data.productName?.trim() &&
    data.productPrice > 0
  );

  const sections = {
    profile: {
      isComplete: profileComplete,
      message: profileComplete ? 'Información comercial completa' : 'Faltan nombre, teléfono o categoría'
    },
    branding: {
      isComplete: brandingComplete,
      message: brandingComplete ? 'Identidad visual configurada' : 'Falta subir logo o portada'
    },
    branch: {
      isComplete: branchComplete,
      message: branchComplete ? 'Sucursal y geolocalización configuradas' : 'Falta departamento/municipio válido, dirección o GPS'
    },
    hours: {
      isComplete: hasValidSchedule,
      message: hasValidSchedule ? 'Horario de apertura definido' : 'Debe configurar al menos un día'
    },
    delivery: {
      isComplete: deliveryComplete,
      message: deliveryComplete ? 'Parámetros de entrega configurados' : 'Defina costo y radio de cobertura'
    },
    finance: {
      isComplete: financeComplete,
      message: financeComplete ? 'Información de liquidación bancaria completa' : 'Faltan datos bancarios'
    },
    menu: {
      isComplete: menuComplete,
      message: menuComplete ? 'Categoría de catálogo creada' : 'Defina el nombre de la categoría'
    },
    products: {
      isComplete: productsComplete,
      message: productsComplete ? 'Primer producto configurado' : 'Defina nombre y precio del producto'
    }
  };

  const totalSections = Object.keys(sections).length;
  const completedCount = Object.values(sections).filter((s) => s.isComplete).length;
  const completionPercentage = Math.round((completedCount / totalSections) * 100);
  const complete = completedCount === totalSections;

  return {
    complete,
    completionPercentage,
    sections
  };
}
