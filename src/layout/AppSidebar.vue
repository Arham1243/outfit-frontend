<script setup>
import { computed } from 'vue';
import { useLayout } from '@/layout/composables/layout';
import { useSessionStore } from '@/stores';
import AppMenu from './AppMenu.vue';

const { layoutState } = useLayout();
const sessionStore = useSessionStore();

let timeout = null;

const currentUser = computed(() => sessionStore.user);
const userRole = computed(() => sessionStore.userRole);

const userInitials = computed(() => {
    const name = currentUser.value?.name?.trim();
    if (!name) {
        return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
});

const userSubtitle = computed(() => {
    return userRole.value?.name || currentUser.value?.email || '';
});

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

function openProfile() {
    layoutState.profileSidebarVisible = !layoutState.profileSidebarVisible;
}
</script>

<template>
    <div
        class="layout-sidebar sidebar-premium"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
    >
        <header class="sidebar-header">
            <router-link :to="{ name: 'Wardrobe' }" class="sidebar-brand">
                <span class="sidebar-brand__mark" aria-hidden="true">
                    <i class="pi pi-sparkles"></i>
                </span>
                <span class="sidebar-brand__copy">
                    <p class="sidebar-brand__title">
                        <span class="sidebar-brand__name">Outfit</span>
                        <span class="sidebar-brand__suffix">Studio</span>
                    </p>
                    <p class="sidebar-brand__tagline">
                        {{ $t('layout.sidebar.tagline') }}
                    </p>
                </span>
            </router-link>
            <button
                class="layout-sidebar-anchor z-20"
                type="button"
                :aria-label="$t('layout.sidebar.anchor')"
                @click="onAnchorToggle"
            ></button>
        </header>

        <div class="layout-menu-container">
            <p class="sidebar-section-label">
                {{ $t('layout.sidebar.workspace') }}
            </p>
            <AppMenu />
        </div>

        <footer v-if="currentUser" class="sidebar-footer">
            <button
                type="button"
                class="sidebar-user-card"
                @click="openProfile"
            >
                <span class="sidebar-user-card__avatar" aria-hidden="true">
                    {{ userInitials }}
                </span>
                <span class="sidebar-user-card__copy">
                    <span class="sidebar-user-card__name">
                        {{ currentUser.name }}
                    </span>
                    <span class="sidebar-user-card__role">
                        {{ userSubtitle || $t('layout.sidebar.member') }}
                    </span>
                </span>
            </button>
        </footer>
    </div>
</template>

<style lang="scss" scoped></style>
