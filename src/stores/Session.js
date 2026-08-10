import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCookies } from 'vue3-cookies';
import {
    resetLayoutState,
    initAppearancePreference,
    applySidebarOpen
} from '@/layout/composables/layout';
import { updateAbility } from '@/plugins/ability';
import { AuthService } from '@/services';
import { resetLocale, syncLocaleFromUser } from '@/i18n';

const getCookieName = () => {
    const host = window.location.hostname.replace(/\./g, '_');
    return `wms_${host}`;
};

/**
 * LoginResource sends expires_at as a Unix timestamp (seconds). Older clients
 * mistakenly treated it as a TTL; normalize to epoch ms for the auth cookie.
 */
const normalizeExpiryEpochMs = (expiresIn) => {
    const n = Number(expiresIn);
    if (!Number.isFinite(n) || n <= 0) {
        return Date.now() + 86400 * 1000;
    }
    if (n >= 1_000_000_000) {
        return n * 1000;
    }
    return Date.now() + n * 1000;
};

export const useSessionStore = defineStore('SessionStore', () => {
    const { cookies } = useCookies();
    const cookieName = getCookieName();
    const user = ref(null);
    const permissions = ref([]);
    const userRole = ref({});
    const intendedRoute = ref(sessionStorage.getItem('intendedRoute'));

    const startUserSession = (data) => {
        const authCookie = getCookie() || {};
        authCookie.access_token = data.access_token;
        authCookie.expires_in = normalizeExpiryEpochMs(data.expires_in);

        if (data.refresh_token) {
            authCookie.refresh_token = data.refresh_token;
        }

        setCookie(authCookie);
    };

    const clearSessionState = () => {
        cookies.remove(cookieName, null);
        sessionStorage.removeItem('email');
        user.value = null;
        resetLocale();
        permissions.value = [];
        resetLayoutState();
    };

    const setCookie = (value) => {
        cookies.set(cookieName, value, '7d');
    };

    const getCookie = () => {
        return cookies.get(cookieName);
    };

    const setEmail = (value) => {
        sessionStorage.setItem('email', value);
    };

    const getEmail = () => {
        return sessionStorage.getItem('email');
    };

    const me = async (opts = {}) => {
        const { bearerToken } = opts;
        const axiosConfig =
            bearerToken != null && bearerToken !== ''
                ? { headers: { Authorization: `Bearer ${bearerToken}` } }
                : {};
        const res = (await AuthService.me(axiosConfig)).data;

        user.value = res.data;
        syncLocaleFromUser(user.value);
        initAppearancePreference(!!user.value?.dark_mode);
        applySidebarOpen(user.value?.sidebar_open !== false);
        permissions.value = res.permissions ?? [];
        userRole.value = res.role ?? {};
        updateAbility(permissions.value);

        return user.value;
    };

    const setIntended = (route) => {
        intendedRoute.value = route;
        sessionStorage.setItem('intendedRoute', route);
    };

    const consumeIntended = () => {
        const route = intendedRoute.value;
        intendedRoute.value = null;
        sessionStorage.removeItem('intendedRoute');
        return route;
    };

    return {
        startUserSession,
        clearSessionState,
        me,
        user,
        permissions,
        userRole,
        setEmail,
        setCookie,
        getCookie,

        getEmail,
        setIntended,
        consumeIntended
    };
});
