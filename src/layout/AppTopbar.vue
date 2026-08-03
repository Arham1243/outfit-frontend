<script setup>
import { setDarkTheme, useLayout } from '@/layout/composables/layout';
import AppBreadcrumb from './AppBreadcrumb.vue';
import { onBeforeUnmount, watch } from 'vue';
import { useSessionStore } from '@/stores';
import { AuthService } from '@/services';

import imgMoon from '@/assets/images/moon.png';
import imgSun from '@/assets/images/sun.png';

const sessionStore = useSessionStore();
const currentUser = sessionStore.user;

const { toggleMenu, layoutConfig, layoutState } = useLayout();

/** Applied on `<html>` while topbar overlays are open — see `overrides.scss`. */
const TOPBAR_SCROLL_LOCK_CLASS = 'layout-topbar-scroll-lock';

function syncTopbarOverlayScrollLock() {
    const lock = Boolean(layoutState.profileSidebarVisible);
    document.documentElement.classList.toggle(TOPBAR_SCROLL_LOCK_CLASS, lock);
}

watch(
    () => layoutState.profileSidebarVisible,
    () => syncTopbarOverlayScrollLock(),
    { immediate: true }
);

onBeforeUnmount(() => {
    document.documentElement.classList.remove(TOPBAR_SCROLL_LOCK_CLASS);
});

function showProfileSidebar() {
    layoutState.profileSidebarVisible = !layoutState.profileSidebarVisible;
}

function toggleDarkMode() {
    if (!document.startViewTransition) {
        executeDarkModeToggle();
        return;
    }

    document.startViewTransition(() => executeDarkModeToggle());
}

function persistDarkMode(isDark) {
    AuthService.updateUiPreferences({ dark_mode: isDark })
        .then(() => {
            if (sessionStore.user) {
                sessionStore.user.dark_mode = isDark;
            }
        })
        .catch(() => {});
}

function executeDarkModeToggle() {
    const next = !layoutConfig.darkTheme;
    setDarkTheme(next);
    persistDarkMode(next);
}
</script>

<template>
    <div class="layout-topbar app-topbar">
        <div class="topbar-start">
            <Button
                type="button"
                class="topbar-menubutton p-trigger"
                @click="toggleMenu"
            >
                <i class="pi pi-bars"></i>
            </Button>

            <AppBreadcrumb class="topbar-breadcrumb"></AppBreadcrumb>
        </div>

        <div class="topbar-end">
            <ul class="topbar-menu topbar-menu--trailing">
                <li>
                    <Button
                        type="button"
                        rounded
                        class="topbar-icon-button"
                        :aria-label="$t('layout.toggle_dark_mode')"
                        @click="toggleDarkMode"
                        :class="
                            layoutConfig.darkTheme
                                ? 'bg-gray-700 text-white'
                                : ''
                        "
                    >
                        <img
                            :src="layoutConfig.darkTheme ? imgSun : imgMoon"
                            alt="Image"
                            class="topbar-action-img"
                        />
                    </Button>
                </li>
                <li class="topbar-profile">
                    <Button
                        type="button"
                        class="topbar-sidebarbutton"
                        @click="showProfileSidebar"
                    >
                        <template v-if="currentUser.profile_image">
                            <img
                                :src="
                                    currentUser.profile_image ||
                                    '/demo/images/avatar/avatar.png'
                                "
                                :alt="$t('layout.profile_alt')"
                            />
                        </template>
                        <template v-else>
                            <span class="topbar-avatar-text">{{
                                currentUser.name[0]
                            }}</span>
                        </template>
                    </Button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.app-topbar {
    gap: 0.5rem;
}

.app-topbar .topbar-menu--trailing {
    justify-content: flex-end;
}

@media (max-width: 639px) {
    .app-topbar {
        flex-wrap: wrap;
    }

    .app-topbar .topbar-start {
        order: 1;
        flex: 0 0 auto;
    }

    .app-topbar .topbar-end {
        order: 2;
        flex: 1 1 auto;
        min-width: 0;
    }
}

@media (min-width: 640px) {
    .app-topbar {
        flex-wrap: nowrap;
    }
}

span.topbar-avatar-text {
    font-size: 1.35rem;
    color: #000;
}

:global(.app-dark) .topbar-profile :deep(button.topbar-sidebarbutton) {
    background-color: #fff;
}

.topbar-icon-button {
    width: 2.5rem !important;
    height: 2.5rem !important;
    min-width: 2.5rem !important;
    padding: 0 !important;
    border-radius: 50% !important;
}

.topbar-icon-button .topbar-action-img {
    width: 1.25rem;
    height: 1.25rem;
    object-fit: contain;
    display: block;
    filter: brightness(0) invert(1);
}
</style>
