import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';
import { useSessionStore, useGlobalStore } from '@/stores';
import { ability } from '@/plugins/ability';

const router = createRouter({
    history: createWebHistory(),
    routes: routes
});

router.beforeEach(async (to, from, next) => {
    const sessionStore = useSessionStore();
    const globalStore = useGlobalStore();

    const { access_token: accessToken } = sessionStore.getCookie() || {};
    const isAuth = to.path.startsWith('/auth');
    const isOfflineRoute = to.name === 'Offline';

    if (!navigator.onLine && !isOfflineRoute) {
        return next({ name: 'Offline', query: { redirect: to.fullPath } });
    }

    if (isOfflineRoute) {
        return next();
    }

    // Reset forbidden state
    globalStore.setRouteForbidden(false);

    // Not logged in - allow /auth/*
    if (!accessToken) {
        if (isAuth) return next();
        sessionStore.setIntended(to.fullPath);
        return next({ name: 'Login' });
    }

    // Logged in, prevent going to auth pages
    if (accessToken && isAuth) return next({ name: 'Wardrobe' });

    // Ensure user is loaded
    if (!sessionStore.user) {
        try {
            await sessionStore.me();
        } catch (err) {
            return next({ name: 'Login' });
        }
    }

    if (to.meta.skipPermissionCheck) {
        return next();
    }

    const requiredPermissions = Array.isArray(to.meta.permission)
        ? to.meta.permission
        : to.meta.permission
          ? [to.meta.permission]
          : [];

    const hasPermission =
        requiredPermissions.length === 0
            ? true
            : requiredPermissions.some((p) => ability.can(p));

    if (!hasPermission) {
        // Handle tab children if any
        if (to.meta.hasTabs) {
            const parentRecord = to.matched[to.matched.length - 2];
            const children = parentRecord?.children || [];

            for (const child of children) {
                const childPerms = Array.isArray(child.meta?.permission)
                    ? child.meta.permission
                    : child.meta?.permission
                      ? [child.meta.permission]
                      : [];

                if (
                    childPerms.length === 0 ||
                    childPerms.some((p) => ability.can(p))
                ) {
                    return next({ name: child.name });
                }
            }
        }

        globalStore.setRouteForbidden(true);
        return next();
    }

    // Everything okay
    next();
});

export default router;
