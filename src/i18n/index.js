import { createI18n } from 'vue-i18n';
import { FALLBACK_LOCALE } from './platformLocales';
import { resolveApiLocale, resolveAppLocale } from './resolveLocale';

const localeModules = import.meta.glob('./locales/*.json', { eager: true });

const messages = {};
for (const path in localeModules) {
    const localeName = path.match(/\.\/locales\/([^.]+)\.json$/)?.[1];
    if (localeName) {
        messages[localeName] = localeModules[path].default;
    }
}

let acceptLanguageLocale = FALLBACK_LOCALE;

const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: FALLBACK_LOCALE,
    fallbackLocale: FALLBACK_LOCALE,
    messages
});

export function setAppLocale(locale) {
    i18n.global.locale.value = locale;
}

export function getAcceptLanguageLocale() {
    return acceptLanguageLocale;
}

export function resetLocale() {
    setAppLocale(FALLBACK_LOCALE);
    acceptLanguageLocale = FALLBACK_LOCALE;
}

export function syncLocaleFromPreferredLanguage(preferredLanguage) {
    setAppLocale(resolveAppLocale(preferredLanguage));
    acceptLanguageLocale = resolveApiLocale(preferredLanguage);
}

export function syncLocaleFromUser(user) {
    const preferred =
        user?.preferred_language ?? user?.preferredLanguage ?? null;
    syncLocaleFromPreferredLanguage(preferred);
}

export { resolveApiLocale, resolveAppLocale };

export default i18n;
