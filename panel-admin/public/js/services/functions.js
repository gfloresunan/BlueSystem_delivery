// Servicio de Cloud Functions para administración y notificaciones
const functionsService = {
    // Llama a adminUpdateUser callable
    updateUser: async (action, targetUid, email = '', role = '', isActive = true) => {
        const callable = firebase.functions().httpsCallable('adminUpdateUser');
        const result = await callable({ action, targetUid, email, role, isActive });
        return result.data;
    },

    // Llama a adminResetPassword callable
    resetPassword: async (email) => {
        const callable = firebase.functions().httpsCallable('adminResetPassword');
        const result = await callable({ email });
        return result.data;
    },

    // Llama a sendPushNotification callable
    sendNotification: async (title, body, imageUrl = '', actionUrl = '', targetType = 'all', targetUids = [], segment = '') => {
        const callable = firebase.functions().httpsCallable('sendPushNotification');
        const result = await callable({ title, body, imageUrl, actionUrl, targetType, targetUids, segment });
        return result.data;
    },

    // Llama a diagnoseFcmSystem callable
    diagnoseFcm: async () => {
        const callable = firebase.functions().httpsCallable('diagnoseFcmSystem');
        const result = await callable({});
        return result.data;
    },

    // Llama a sendFcmDiagnostic callable (Smoke Test FCM Controlado por dispositivo)
    sendFcmDiagnostic: async (targetUid, deviceId) => {
        const callable = firebase.functions().httpsCallable('sendFcmDiagnostic');
        const result = await callable({ targetUid, deviceId });
        return result.data;
    },

    // ─── EIAM-ADMIN — Nuevos métodos de administración de identidad ───────────

    // Genera enlace seguro de restablecimiento de contraseña vía Firebase Admin SDK.
    // SEGURIDAD: La contraseña NUNCA pasa por el navegador. Solo se genera un enlace.
    resetPasswordLink: async (targetUid, email, reason = '') => {
        const callable = firebase.functions().httpsCallable('adminUpdateUser');
        const result = await callable({ action: 'resetPasswordLink', targetUid, email, reason });
        return result.data;
    },

    // Revoca todas las sesiones activas del usuario (revokeRefreshTokens en Firebase Auth).
    // El usuario deberá iniciar sesión nuevamente en todos sus dispositivos.
    revokeSessions: async (targetUid, reason = '') => {
        const callable = firebase.functions().httpsCallable('adminUpdateUser');
        const result = await callable({ action: 'revokeSessions', targetUid, reason });
        return result.data;
    },

    // Actualiza nombre y/o teléfono en Firestore (sin tocar Firebase Auth).
    updateProfile: async (targetUid, nombre, telefono, reason = '') => {
        const callable = firebase.functions().httpsCallable('adminUpdateUser');
        const result = await callable({ action: 'updateProfile', targetUid, nombre, telefono, reason });
        return result.data;
    },

    // ─── FASE 4.2 — Notificaciones: Eliminación Lógica & Deshabilitación por Cliente ────────

    // Marca eliminación lógica de una campaña en notification_campaigns (conservando historial y métricas).
    adminDeleteCampaign: async (campaignId) => {
        const callable = firebase.functions().httpsCallable('adminDeleteCampaign');
        const result = await callable({ campaignId });
        return result.data;
    },

    // Deshabilita una notificación para un cliente específico en users/{targetUid}/notifications/{campaignId}.
    adminDisableNotificationForUser: async (campaignId, targetUid) => {
        const callable = firebase.functions().httpsCallable('adminDisableNotificationForUser');
        const result = await callable({ campaignId, targetUid });
        return result.data;
    },

    // ─── ACTIVIDAD #8 — Zonas Calientes / Heatmap Analytics ───────────────────
    getHeatmapData: async (filters = {}) => {
        const callable = firebase.functions().httpsCallable('adminGetHeatmapData');
        const result = await callable(filters);
        return result.data;
    }
};


