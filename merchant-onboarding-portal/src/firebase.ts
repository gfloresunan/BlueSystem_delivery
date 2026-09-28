import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ─── Firebase Configuration ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bluesystem-7c9af.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bluesystem-7c9af",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bluesystem-7c9af.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "514416631826",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:514416631826:web:ceff16519cecd24088b8cb",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);

// Functions instance — region us-central1 (Firebase default)
export const functions = getFunctions(app);

// ─── Callable References ──────────────────────────────────────────────────────
const submitApplicationCallable = httpsCallable(functions, 'submitMerchantApplication');
export const getApplicationStatusCallable = httpsCallable(functions, 'getMerchantApplicationStatus');

// ─── Submit Application — Callable Only (ADR-011.3) ──────────────────────────
/**
 * Submits a merchant application via the Cloud Function callable.
 *
 * ARCHITECTURE RULE (ADR-011.3):
 * - This function MUST call submitMerchantApplication exclusively.
 * - There is NO direct Firestore fallback.
 * - On callable failure the error is propagated to the UI for user retry.
 * - The success screen MUST only render when this function resolves.
 */
export async function submitMerchantApplication(data: {
  applicationId: string;
  tenantId?: string;
  tenantSlug?: string;
  businessName: string;
  legalName: string;
  ruc: string;
  departmentId?: string;
  departmentName?: string;
  municipalityId?: string;
  municipalityName?: string;
  address: string;
  city: string;
  zone?: string;
  category: string;
  businessCategoryId?: string;
  contactName: string;
  phone: string;
  email: string;
  location?: { latitude: number; longitude: number };
  documents?: unknown[];
  documentUrls?: string[];
}): Promise<{ success: true; applicationId: string; message: string }> {

  console.log('[EIAM Portal] submitApplication:start', { email: data.email });

  let result: Awaited<ReturnType<typeof submitApplicationCallable>>;

  try {
    result = await submitApplicationCallable(data);
  } catch (err: unknown) {
    // ─── Callable threw a FirebaseError or network error ────────────────
    const firebaseErr = err as { code?: string; message?: string };
    const code = firebaseErr?.code ?? '';
    const message = firebaseErr?.message ?? '';

    console.error('[EIAM Portal] submitApplication:error', { code, message });

    // Business errors
    if (
      code === 'functions/already-exists' ||
      message.includes('already-exists') ||
      message.includes('Ya existe')
    ) {
      throw new Error(
        'Ya existe una solicitud activa registrada con este correo electrónico. Te contactaremos pronto o puedes consultar el estado.'
      );
    }
    if (code === 'functions/invalid-argument' || code === 'invalid-argument') {
      throw new Error('Revisa los datos requeridos de la solicitud.');
    }
    if (code === 'functions/permission-denied' || code === 'permission-denied') {
      throw new Error('No tienes permisos para realizar esta operación.');
    }
    if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
      throw new Error('No fue posible validar la solicitud.');
    }

    // Infrastructure / connectivity errors — NO silent fallback, propagate for retry
    if (code === 'functions/unavailable' || code === 'unavailable') {
      throw new Error('El servicio no está disponible temporalmente. Intenta nuevamente.');
    }
    if (code === 'functions/deadline-exceeded' || code === 'deadline-exceeded') {
      throw new Error('La solicitud tardó demasiado. Intenta nuevamente.');
    }
    if (code === 'functions/internal' || code === 'internal') {
      throw new Error('No pudimos completar el envío. Intenta nuevamente.');
    }

    // Catch-all
    throw new Error('No pudimos enviar la solicitud. Intenta nuevamente.');
  }

  // ─── Callable resolved — validate server response ────────────────────────
  const responseData = result.data as {
    success?: boolean;
    applicationId?: string;
    message?: string;
  } | null;

  if (responseData?.success === true && responseData.applicationId) {
    console.log('[EIAM Portal] submitApplication:success', {
      applicationId: responseData.applicationId,
    });
    return {
      success: true,
      applicationId: responseData.applicationId,
      message: responseData.message ?? 'Solicitud enviada exitosamente.',
    };
  }

  // Callable returned but without expected confirmation — treat as error
  console.error('[EIAM Portal] submitApplication:error', {
    reason: 'Callable resolved without expected success payload',
    data: responseData,
  });
  throw new Error('No se recibió confirmación del servidor. Intenta nuevamente.');
}

// ─── Document Upload ──────────────────────────────────────────────────────────
export interface DocumentUploadResult {
  name: string;
  type: string;
  storagePath: string;
  downloadUrl?: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

/**
 * Uploads a legal document to Firebase Storage under a path isolated by applicationId.
 * Returns metadata (storagePath, contentType, size) — no public download URL.
 */
export function uploadDocumentFile(
  file: File,
  applicationId: string,
  docType: string,
  onProgress: (progress: number) => void
): Promise<DocumentUploadResult> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `merchant_applications_docs/${applicationId}/${docType.toLowerCase()}_${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    let mimeType = file.type;
    if (!mimeType || mimeType === 'image/jpg') {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lower.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lower.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else if (lower.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: mimeType,
      customMetadata: {
        applicationId,
        documentType: docType,
        originalName: file.name,
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error('[EIAM Portal] Error subiendo archivo a Storage:', error);
        reject(error);
      },
      () => {
        resolve({
          name: file.name,
          type: docType,
          storagePath,
          contentType: mimeType,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
    );
  });
}

// ─── Courier Onboarding Callables & Uploads ───────────────────────────────────

const submitCourierApplicationCallable = httpsCallable(functions, 'submitCourierApplication');
export const getCourierApplicationStatusCallable = httpsCallable(functions, 'getCourierApplicationStatus');

export interface CourierApplicationData {
  applicationId: string;
  tenantId?: string;
  tenantSlug?: string;
  personal: {
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
  };
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  };
  documents: {
    idFront: DocumentUploadResult;
    idBack: DocumentUploadResult;
    profilePhoto: DocumentUploadResult;
    registration: DocumentUploadResult;
    insurance: DocumentUploadResult;
    driverLicense: DocumentUploadResult;
  };
}

export async function submitCourierApplication(
  data: CourierApplicationData
): Promise<{ success: true; applicationId: string; message: string }> {
  console.log('[Courier Portal] submitCourierApplication:start', { email: data.personal.email, plate: data.vehicle.plate });

  try {
    const result = await submitCourierApplicationCallable(data);
    const responseData = result.data as {
      success?: boolean;
      applicationId?: string;
      message?: string;
    } | null;

    if (responseData?.success === true && responseData.applicationId) {
      return {
        success: true,
        applicationId: responseData.applicationId,
        message: responseData.message || 'Solicitud de motorizado enviada exitosamente.',
      };
    }
    throw new Error('No se recibió confirmación del servidor. Intenta nuevamente.');
  } catch (err: any) {
    const code = err?.code || '';
    const message = err?.message || '';
    console.error('[Courier Portal] submitCourierApplication:error', { code, message });

    if (code === 'functions/already-exists' || message.includes('already-exists') || message.includes('Ya existe')) {
      throw new Error(message || 'Ya existe una solicitud activa con este correo, cédula o placa.');
    }
    if (code === 'functions/invalid-argument' || message.includes('invalid-argument')) {
      throw new Error(message || 'Revisa los campos obligatorios del formulario.');
    }
    throw new Error(message || 'Error al enviar la solicitud. Por favor intenta de nuevo.');
  }
}

/**
 * Uploads a courier document to Firebase Storage under /courier_applications_docs/{applicationId}/{docType}
 */
export function uploadCourierDocumentFile(
  file: File,
  applicationId: string,
  docType: string,
  onProgress: (progress: number) => void
): Promise<DocumentUploadResult> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `courier_applications_docs/${applicationId}/${docType.toLowerCase()}_${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    let mimeType = file.type;
    if (!mimeType || mimeType === 'image/jpg') {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (lower.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (lower.endsWith('.webp')) {
        mimeType = 'image/webp';
      } else if (lower.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else {
        mimeType = 'image/jpeg';
      }
    }

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: mimeType,
      customMetadata: {
        applicationId,
        documentType: docType,
        originalName: file.name,
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (error) => {
        console.error('[Courier Portal] Error subiendo archivo a Storage:', error);
        reject(error);
      },
      async () => {
        let downloadUrl = '';
        try {
          downloadUrl = await getDownloadURL(storageRef);
        } catch (urlErr) {
          console.warn('[Courier Portal] No se pudo obtener downloadUrl directo:', urlErr);
        }
        resolve({
          name: file.name,
          type: docType,
          storagePath,
          downloadUrl: downloadUrl || undefined,
          contentType: mimeType,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
    );
  });
}
