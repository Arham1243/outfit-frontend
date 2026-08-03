import {
    FALLBACK_LOCALE,
    LOADED_MESSAGE_LOCALES,
    PLATFORM_LOCALES
} from './platformLocales';

/**
 * Preferred language locale for API requests (Accept-Language header).
 */
export function resolveApiLocale(preferredLanguage) {
    if (!preferredLanguage) {
        return FALLBACK_LOCALE;
    }

    const raw =
        preferredLanguage.locale ?? preferredLanguage.code ?? FALLBACK_LOCALE;
    const normalized = String(raw).trim();

    return normalized || FALLBACK_LOCALE;
}

/**
 * Map API preferred_language (code / locale) to a vue-i18n message bundle key.
 */
export function resolveAppLocale(preferredLanguage) {
    if (!preferredLanguage) {
        return FALLBACK_LOCALE;
    }

    const raw =
        preferredLanguage.locale ?? preferredLanguage.code ?? FALLBACK_LOCALE;
    const normalized = String(raw).trim();

    if (LOADED_MESSAGE_LOCALES.includes(normalized)) {
        return normalized;
    }

    const base = normalized.split('-')[0]?.toLowerCase();
    if (base && LOADED_MESSAGE_LOCALES.includes(base)) {
        return base;
    }

    if (PLATFORM_LOCALES.includes(normalized)) {
        return FALLBACK_LOCALE;
    }

    return FALLBACK_LOCALE;
}
