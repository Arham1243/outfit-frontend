<script setup>
import {
    resolveAppearanceToDark,
    setAppearance,
    useLayout
} from '@/layout/composables/layout';
import { useSessionStore } from '@/stores';
import { AuthService } from '@/services';

import imgMoon from '@/assets/images/moon.png';
import imgSun from '@/assets/images/sun.png';

const sessionStore = useSessionStore();
const { layoutConfig } = useLayout();

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
    const nextAppearance = layoutConfig.darkTheme ? 'light' : 'dark';
    setAppearance(nextAppearance);
    persistDarkMode(resolveAppearanceToDark(nextAppearance));
}
</script>

<template>
    <div class="layout-topbar app-topbar app-topbar--actions-only">
        <div class="topbar-end">
            <ul class="topbar-menu topbar-menu--trailing">
                <li>
                    <Button
                        type="button"
                        rounded
                        class="topbar-icon-button"
                        :class="{ 'topbar-icon-button--active': layoutConfig.darkTheme }"
                        :aria-label="$t('layout.toggle_dark_mode')"
                        @click="toggleDarkMode"
                    >
                        <img
                            :src="layoutConfig.darkTheme ? imgSun : imgMoon"
                            alt=""
                            class="topbar-action-img"
                        />
                    </Button>
                </li>
            </ul>
        </div>
    </div>
</template>

<style lang="scss" scoped></style>
