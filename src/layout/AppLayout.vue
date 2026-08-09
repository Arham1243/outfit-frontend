<script setup>
import { useRoute } from 'vue-router';
import { useLayout } from '@/layout/composables/layout';
import {
    computed,
    onBeforeMount,
    onBeforeUnmount,
    ref,
    watch
} from 'vue';
import AppConfig from './AppConfig.vue';
import AppProfileSidebar from './AppProfileSidebar.vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import Forbidden from '@/views/errors/Forbidden.vue';
import { useSessionStore, useGlobalStore } from '@/stores';

const { layoutConfig, layoutState, isSidebarActive } = useLayout();

const outsideClickListener = ref(null);
const loading = ref(true);
const currentUser = ref(null);
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();
const route = useRoute();

const layoutContentWrapperClass = computed(() => ({
    'layout-content-wrapper--fill': Boolean(route.meta.fillViewport)
}));

const layoutContentClass = computed(() => ({
    'layout-content--full-width': Boolean(route.meta.fullWidthContent),
    'layout-content--fill': Boolean(route.meta.fillViewport)
}));

function bindOutsideClickListener() {
    if (!outsideClickListener.value) {
        outsideClickListener.value = (event) => {
            if (isOutsideClicked(event)) {
                layoutState.overlayMenuActive = false;
                layoutState.overlaySubmenuActive = false;
                layoutState.staticMenuMobileActive = false;
                layoutState.menuHoverActive = false;
                layoutState.configSidebarVisible = false;
            }
        };
        document.addEventListener('click', outsideClickListener.value);
    }
}

function unbindOutsideClickListener() {
    if (outsideClickListener.value) {
        document.removeEventListener('click', outsideClickListener.value);
        outsideClickListener.value = null;
    }
}

function isOutsideClicked(event) {
    const sidebarEl = document.querySelector('.layout-sidebar');
    const topbarButtonEl = document.querySelector('.sidebar-menu-toggle');

    return !(
        sidebarEl?.isSameNode(event.target) ||
        sidebarEl?.contains(event.target) ||
        topbarButtonEl?.isSameNode(event.target) ||
        topbarButtonEl?.contains(event.target)
    );
}

watch(isSidebarActive, (newVal) => {
    if (newVal) {
        bindOutsideClickListener();
    } else {
        unbindOutsideClickListener();
    }
});

onBeforeMount(async () => {
    if (!sessionStore.user) {
        await sessionStore.me();
    }
    currentUser.value = sessionStore.user;
    loading.value = false;
});

onBeforeUnmount(() => {
    unbindOutsideClickListener();
});

const containerClass = computed(() => {
    return {
        'layout-light': !layoutConfig.darkTheme,
        'layout-dark': layoutConfig.darkTheme,
        'layout-colorscheme-menu': layoutConfig.menuTheme === 'colorScheme',
        'layout-primarycolor-menu': layoutConfig.menuTheme === 'primaryColor',
        'layout-transparent-menu': layoutConfig.menuTheme === 'transparent',
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-slim': layoutConfig.menuMode === 'slim',
        'layout-slim-plus': layoutConfig.menuMode === 'slim-plus',
        'layout-horizontal': layoutConfig.menuMode === 'horizontal',
        'layout-reveal': layoutConfig.menuMode === 'reveal',
        'layout-drawer': layoutConfig.menuMode === 'drawer',
        'layout-static-inactive':
            layoutState.staticMenuDesktopInactive &&
            layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive,
        'layout-sidebar-active': layoutState.sidebarActive,
        'layout-sidebar-anchored': layoutState.anchored
    };
});
</script>

<template>
    <Forbidden v-if="globalStore.routeForbidden" />
    <div :class="['layout-container', { ...containerClass }]" v-else>
        <div
            class="w-screen h-screen flex justify-center items-center"
            v-if="loading"
        >
            <Loader />
        </div>
        <div v-else-if="!loading">
            <AppSidebar />
            <div
                class="layout-content-wrapper"
                :class="layoutContentWrapperClass"
            >
                <AppTopbar />
                <div class="layout-content" :class="layoutContentClass">
                    <router-view></router-view>
                </div>
            </div>
            <AppProfileSidebar />
            <AppConfig />
        </div>
        <Toast></Toast>
        <div class="layout-mask"></div>
    </div>
</template>
