import { computed, reactive } from 'vue';

const layoutConfig = reactive({
    preset: 'Aura',
    primary: 'emerald',
    surface: null,
    darkTheme: false,
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
    accountMenuVisible: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    activeMenuItem: null
});

/** Reset transient UI (sidebars, overlays). Call when the session ends so the next login starts clean. */
/** Sync layout + Tailwind/Prime dark selector on `<html>`. */
export function setDarkTheme(isDark) {
    const on = !!isDark;
    layoutConfig.darkTheme = on;
    document.documentElement.classList.toggle('app-dark', on);
}

export function resetLayoutState() {
    layoutState.staticMenuDesktopInactive = false;
    layoutState.overlayMenuActive = false;
    layoutState.sidebarActive = false;
    layoutState.anchored = false;
    layoutState.overlaySubmenuActive = false;
    layoutState.profileSidebarVisible = false;
    layoutState.profileDialogVisible = false;
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
                const nextAnchored = !layoutState.anchored;
                layoutState.anchored = nextAnchored;
                layoutState.sidebarActive = nextAnchored;
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

    const openSettings = () => {
        layoutState.accountMenuVisible = false;
        layoutState.configSidebarVisible = true;
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
        openSettings,
        isSlim,
        isSlimPlus,
        isHorizontal,
        isDesktop
    };
}
