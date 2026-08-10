import { computed, reactive } from 'vue';

const APPEARANCE_STORAGE_KEY = 'outfit-ui-appearance';

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
    appearance: 'system',
    menuMode: 'drawer',
    menuTheme: 'colorScheme'
});

const layoutState = reactive({
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    sidebarActive: true,
    anchored: true,
    overlaySubmenuActive: false,
    profileSidebarVisible: false,
    profileDialogVisible: false,
    settingsDialogVisible: false,
    accountMenuVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null
});

/** Reset transient UI (sidebars, overlays). Call when the session ends so the next login starts clean. */
export function getSystemPrefersDark() {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveAppearanceToDark(appearance) {
    if (appearance === 'dark') {
        return true;
    }

    if (appearance === 'light') {
        return false;
    }

    return getSystemPrefersDark();
}

/** Sync layout + Tailwind/Prime dark selector on `<html>`. */
export function setDarkTheme(isDark) {
    const on = !!isDark;
    layoutConfig.darkTheme = on;
    document.documentElement.classList.toggle('app-dark', on);
}

export function loadStoredAppearance() {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
        return stored;
    }

    return null;
}

export function setAppearance(appearance, { persist = true } = {}) {
    const mode =
        appearance === 'dark' || appearance === 'light' ? appearance : 'system';
    layoutConfig.appearance = mode;

    if (persist && typeof localStorage !== 'undefined') {
        localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
    }

    setDarkTheme(resolveAppearanceToDark(mode));
}

let systemThemeListenerAttached = false;

function handleSystemThemeChange() {
    if (layoutConfig.appearance === 'system') {
        setDarkTheme(getSystemPrefersDark());
    }
}

export function ensureAppearanceListener() {
    if (typeof window === 'undefined' || systemThemeListenerAttached) {
        return;
    }

    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleSystemThemeChange);
    systemThemeListenerAttached = true;
}

export function initAppearancePreference(fallbackDark = false) {
    ensureAppearanceListener();

    const stored = loadStoredAppearance();
    if (stored) {
        setAppearance(stored, { persist: false });
        return;
    }

    setAppearance(fallbackDark ? 'dark' : 'light', { persist: false });
}

/** Apply desktop drawer open/closed from user preference. */
export function applySidebarOpen(open) {
    const isOpen = !!open;
    layoutState.anchored = isOpen;
    layoutState.sidebarActive = isOpen;
}

export function resetLayoutState() {
    layoutState.staticMenuDesktopInactive = false;
    layoutState.overlayMenuActive = false;
    layoutState.sidebarActive = false;
    layoutState.anchored = false;
    layoutState.overlaySubmenuActive = false;
    layoutState.profileSidebarVisible = false;
    layoutState.profileDialogVisible = false;
    layoutState.settingsDialogVisible = false;
    layoutState.accountMenuVisible = false;
    layoutState.configSidebarVisible = false;
    layoutState.staticMenuMobileActive = false;
    layoutState.menuHoverActive = false;
    layoutState.activeMenuItem = null;
}

export function useLayout() {
    const setActiveMenuItem = (item) => {
        layoutState.activeMenuItem = item.value || item;
    };

    const toggleMenu = () => {
        if (layoutConfig.menuMode === 'overlay') {
            layoutState.overlayMenuActive = !layoutState.overlayMenuActive;
            return;
        }

        if (window.innerWidth > 991) {
            if (layoutConfig.menuMode === 'drawer') {
                layoutState.accountMenuVisible = false;
                applySidebarOpen(!layoutState.anchored);
                return;
            }

            layoutState.staticMenuDesktopInactive =
                !layoutState.staticMenuDesktopInactive;
        } else {
            layoutState.staticMenuMobileActive =
                !layoutState.staticMenuMobileActive;
        }
    };

    const toggleConfigSidebar = () => {
        if (isSidebarActive.value) {
            layoutState.overlayMenuActive = false;
            layoutState.overlaySubmenuActive = false;
            layoutState.staticMenuMobileActive = false;
            layoutState.menuHoverActive = false;
        }

        layoutState.accountMenuVisible = false;
        layoutState.configSidebarVisible = !layoutState.configSidebarVisible;
    };

    const closeAccountMenu = () => {
        layoutState.accountMenuVisible = false;
    };

    const toggleAccountMenu = () => {
        layoutState.accountMenuVisible = !layoutState.accountMenuVisible;
    };

    const openProfileDialog = () => {
        layoutState.accountMenuVisible = false;
        layoutState.profileDialogVisible = true;
    };

    const closeProfileDialog = () => {
        layoutState.profileDialogVisible = false;
    };

    const openSettingsDialog = () => {
        layoutState.accountMenuVisible = false;
        layoutState.settingsDialogVisible = true;
    };

    const closeSettingsDialog = () => {
        layoutState.settingsDialogVisible = false;
    };

    const openSettings = () => {
        openSettingsDialog();
    };

    const isDarkTheme = computed(() => layoutConfig.darkTheme);
    const isSidebarActive = computed(
        () =>
            layoutState.overlayMenuActive ||
            layoutState.staticMenuMobileActive ||
            layoutState.overlaySubmenuActive
    );
    const isDesktop = computed(() => window.innerWidth > 991);
    const isSlim = computed(() => layoutConfig.menuMode === 'slim');
    const isSlimPlus = computed(() => layoutConfig.menuMode === 'slim-plus');
    const isHorizontal = computed(() => layoutConfig.menuMode === 'horizontal');

    const getPrimary = computed(() => layoutConfig.primary);
    const getSurface = computed(() => layoutConfig.surface);

    return {
        layoutConfig,
        layoutState,
        getPrimary,
        getSurface,
        toggleMenu,
        isSidebarActive,
        isDarkTheme,
        setActiveMenuItem,
        toggleConfigSidebar,
        closeAccountMenu,
        toggleAccountMenu,
        openProfileDialog,
        closeProfileDialog,
        openSettingsDialog,
        closeSettingsDialog,
        openSettings,
        isSlim,
        isSlimPlus,
        isHorizontal,
        isDesktop
    };
}
