// Configuración de Firebase - Reemplazar con las credenciales del proyecto
const firebaseConfig = {
    apiKey: "AIzaSyD-0-CBKWBjgFpCcZL8dvwRbocLbCDcrGI",
    authDomain: "bluesystem-7c9af.firebaseapp.com",
    projectId: "bluesystem-7c9af",
    storageBucket: "bluesystem-7c9af.firebasestorage.app",
    messagingSenderId: "514416631826",
    appId: "1:514416631826:web:ceff16519cecd24088b8cb"
};

// Inicializar Firebase Core
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Inicialización de Firebase App Check ANTES de instanciar Auth / Firestore / Storage / Functions
let appCheck = null;
if (typeof firebase.appCheck === 'function' && !window.appCheckInitialized) {
    try {
        console.log("[APP_CHECK_AUDIT] Initializing App Check...");
        console.log("[APP_CHECK] Provider: reCAPTCHA Enterprise");
        console.log("[APP_CHECK] Host:", window.location.hostname);
        console.log("[APP_CHECK] App ID:", firebaseConfig.appId);

        const siteKey = window.RECAPTCHA_SITE_KEY || "6Ld84octAAAAAD7hM1x5bDfYDmEiRoarxyoBAP2X";
        console.log("[APP_CHECK] Site key configured:", Boolean(siteKey && typeof siteKey === "string" && siteKey.trim() !== ""));

        if (!siteKey || typeof siteKey !== "string" || siteKey.trim() === "") {
            throw new Error(
                "[App Check] RECAPTCHA_SITE_KEY no está configurada para producción."
            );
        }

        if (typeof firebase.appCheck.ReCaptchaEnterpriseProvider !== 'function') {
            throw new Error(
                "[App Check] ReCaptchaEnterpriseProvider no está disponible."
            );
        }

        appCheck = firebase.appCheck();
        appCheck.activate(
            new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey),
            true // isTokenAutoRefreshEnabled = true
        );
        window.appCheckInitialized = true;
        console.log("[APP_CHECK] Activated successfully");

        // Telemetría de atestación de token (sin exponer el token en bruto)
        if (typeof appCheck.onTokenChanged === 'function') {
            appCheck.onTokenChanged((tokenResult) => {
                if (tokenResult && tokenResult.token) {
                    console.log("[APP_CHECK_TOKEN] 🟢 Token acquired / refreshed successfully (attestation active)");
                }
            }, (err) => {
                console.warn("[APP_CHECK_TOKEN] Token acquisition note:", err && err.message ? err.message : err);
            });
        }
    } catch (e) {
        console.warn("[APP_CHECK] Initialization notice:", e);
    }
}

// Instanciar servicios de Firebase con App Check activo
const auth = typeof firebase.auth === 'function' ? firebase.auth() : null;
const db = typeof firebase.firestore === 'function' ? firebase.firestore() : null;
const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
const functions = typeof firebase.functions === 'function' ? firebase.functions() : null;


