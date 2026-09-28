// BlueSystem Enterprise v2.2 — Safe Local Image Fallback Utility
// Previene bucles infinitos de onError y elimina dependencias de servidores externos obsoletos (via.placeholder.com)

(function (window) {
    'use strict';

    const FALLBACK_MAP = {
        store: '/assets/store-placeholder.svg',
        banner: '/assets/banner-placeholder.svg',
        promo: '/assets/promo-placeholder.svg',
        avatar: '/assets/avatar-placeholder.svg'
    };

    /**
     * Retorna la URL del asset SVG local correspondiente al tipo especificado.
     * @param {string} type - 'store' | 'banner' | 'promo' | 'avatar'
     * @returns {string} Path relativo al asset SVG local
     */
    window.getFallbackUrl = function (type = 'store') {
        return FALLBACK_MAP[type] || FALLBACK_MAP.store;
    };

    /**
     * Manejador inmutable para el evento onError de elementos <img>.
     * Garantiza que la imagen solo intente aplicar el fallback 1 sola vez por elemento DOM.
     * @param {HTMLImageElement} imgElement - Elemento <img> desencadenante del error
     * @param {string} type - Tipo de fallback ('store' | 'banner' | 'promo' | 'avatar')
     */
    window.handleImageError = function (imgElement, type = 'store') {
        if (!imgElement) return;

        // Guardia inmutable: si ya se aplicó el fallback previamente, abortar inmediatamente
        if (imgElement.dataset.fallbackApplied === 'true') {
            return;
        }

        // Marcar como aplicado ANTES de reasignar el src para prevenir carreras
        imgElement.dataset.fallbackApplied = 'true';
        const fallbackUrl = window.getFallbackUrl(type);
        imgElement.src = fallbackUrl;
    };

    /**
     * Normaliza y valida una URL de imagen para entorno Web.
     * Rechaza de forma segura rutas privadas locales de Android (file://, /data/user/, /storage/, content://)
     * emitiendo una advertencia diagnóstica en consola y retornando el asset fallback.
     * @param {string|null|undefined} url - URL a evaluar
     * @param {string} type - Tipo de asset ('store' | 'banner' | 'promo' | 'avatar')
     * @returns {string} URL Web válida o fallback local
     */
    window.normalizeProductImageUrl = function (url, type = 'promo') {
        if (!url || typeof url !== 'string') {
            return window.getFallbackUrl(type);
        }

        const trimmed = url.trim();
        if (!trimmed) {
            return window.getFallbackUrl(type);
        }

        // Detección estricta de rutas privadas Android o filesystem local
        const isLocalAndroidPath = trimmed.startsWith('file://') ||
            trimmed.startsWith('/data/user/') ||
            trimmed.startsWith('/data/data/') ||
            trimmed.startsWith('/storage/emulated/') ||
            trimmed.startsWith('content://');

        if (isLocalAndroidPath) {
            console.warn(`[IMAGE_AUDIT] Producto contiene una ruta local privada de Android no accesible para Web: ${trimmed}. Aplicando fallback visual.`);
            return window.getFallbackUrl(type);
        }

        // URLs HTTPS o relativas web válidas
        if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') || trimmed.startsWith('./')) {
            return trimmed;
        }

        console.warn(`[IMAGE_AUDIT] Formato de URL desconocido: ${trimmed}. Aplicando fallback.`);
        return window.getFallbackUrl(type);
    };

    console.log('[IMAGE_UTILS] Módulo de manejo seguro de imágenes inicializado');
})(typeof window !== 'undefined' ? window : this);
