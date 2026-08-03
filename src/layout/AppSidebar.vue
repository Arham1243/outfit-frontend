<script setup>
import { useLayout } from '@/layout/composables/layout';
import AppMenu from './AppMenu.vue';
import PlaceholderLogo from '@/assets/images/logo.png';

const { layoutState } = useLayout();

let timeout = null;
const sidebarLogo = PlaceholderLogo;

function onMouseEnter() {
    if (!layoutState.anchored) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        layoutState.sidebarActive = true;
    }
}

function onMouseLeave() {
    if (!layoutState.anchored) {
        if (!timeout) {
            timeout = setTimeout(
                () => (layoutState.sidebarActive = false),
                300
            );
        }
    }
}

function onAnchorToggle() {
    layoutState.anchored = !layoutState.anchored;
}
</script>

<template>
    <div
        class="layout-sidebar"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
    >
        <div class="sidebar-header">
            <router-link :to="{ name: 'Wardrobe' }" class="app-logo">
                <img
                    :src="sidebarLogo"
                    alt="Logo"
                    class="app-logo-normal object-contain !h-[6rem] !w-[12rem]"
                />
            </router-link>
            <button
                class="layout-sidebar-anchor z-20 mb-2"
                type="button"
                @click="onAnchorToggle"
            ></button>
        </div>
        <div class="layout-menu-container">
            <AppMenu />
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
