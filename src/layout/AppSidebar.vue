<script setup>
import { computed } from 'vue';
import { useLayout } from '@/layout/composables/layout';
import { useSessionStore } from '@/stores';
import SidebarAccountMenu from './SidebarAccountMenu.vue';
import AppMenu from './AppMenu.vue';

const { layoutState, toggleMenu } = useLayout();
const sessionStore = useSessionStore();

const currentUser = computed(() => sessionStore.user);

const isSidebarExpanded = computed(() => layoutState.anchored);

const sidebarToggleLabel = computed(() =>
    isSidebarExpanded.value
        ? 'layout.sidebar.close_sidebar'
        : 'layout.sidebar.open_sidebar'
);

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

const userSubtitle = computed(() => currentUser.value?.email || '');
</script>

<template>
    <div class="layout-sidebar sidebar-premium">
        <header class="sidebar-header">
            <router-link :to="{ name: 'Wardrobe' }" class="sidebar-brand">
                <span class="sidebar-brand__title">
                    {{ $t('layout.sidebar.brand') }}
                </span>
            </router-link>
            <button
                type="button"
                class="sidebar-menu-toggle p-trigger"
                :class="{ 'sidebar-menu-toggle--expanded': isSidebarExpanded }"
                :aria-label="$t(sidebarToggleLabel)"
                :aria-expanded="isSidebarExpanded"
                v-tooltip.hover.right="$t(sidebarToggleLabel)"
                @click="toggleMenu"
            >
                <svg
                    class="sidebar-panel-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <rect
                        x="4"
                        y="4"
                        width="16"
                        height="16"
                        rx="2.5"
                        stroke="currentColor"
                        stroke-width="1.75"
                    />
                    <path
                        d="M9 4v16"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                    />
                </svg>
            </button>
        </header>

        <div class="layout-menu-container">
            <AppMenu />
        </div>

        <footer v-if="currentUser" class="sidebar-footer">
            <SidebarAccountMenu
                :user-initials="userInitials"
                :user-name="currentUser.name"
                :user-subtitle="userSubtitle"
            />
        </footer>
    </div>
</template>

<style lang="scss" scoped></style>
