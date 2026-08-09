<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
    setDarkTheme,
    useLayout
} from '@/layout/composables/layout';
import { useAuthStore, useSessionStore } from '@/stores';

const props = defineProps({
    userInitials: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userSubtitle: {
        type: String,
        default: ''
    }
});

const router = useRouter();
const sessionStore = useSessionStore();
const authStore = useAuthStore();
const {
    layoutState,
    toggleAccountMenu,
    closeAccountMenu,
    openProfileDialog,
    openSettings
} = useLayout();

const rootRef = ref(null);

const isOpen = computed(() => layoutState.accountMenuVisible);
const userEmail = computed(() => sessionStore.user?.email || '');

function handleDocumentClick(event) {
    if (!isOpen.value) {
        return;
    }

    if (rootRef.value?.contains(event.target)) {
        return;
    }

    closeAccountMenu();
}

function handleEscape(event) {
    if (event.key === 'Escape' && isOpen.value) {
        closeAccountMenu();
    }
}

watch(isOpen, (open) => {
    if (open) {
        document.addEventListener('click', handleDocumentClick, true);
        document.addEventListener('keydown', handleEscape);
    } else {
        document.removeEventListener('click', handleDocumentClick, true);
        document.removeEventListener('keydown', handleEscape);
    }
});

onMounted(() => {
    if (isOpen.value) {
        document.addEventListener('click', handleDocumentClick, true);
        document.addEventListener('keydown', handleEscape);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleDocumentClick, true);
    document.removeEventListener('keydown', handleEscape);
});

function removeDarkMode() {
    setDarkTheme(false);
}

async function logout() {
    closeAccountMenu();

    try {
        await authStore.logout();
    } finally {
        removeDarkMode();
        sessionStore.clearSessionState();
        router.push({ name: 'Login' });
    }
}
</script>

<template>
    <div ref="rootRef" class="sidebar-account">
        <Transition name="sidebar-account-menu">
            <div
                v-if="isOpen"
                class="sidebar-account-menu"
                role="menu"
                :aria-label="$t('layout.account.menu_label')"
            >
                <p
                    v-if="userEmail"
                    class="sidebar-account-menu__email"
                >
                    {{ userEmail }}
                </p>

                <ul class="sidebar-account-menu__list">
                    <li>
                        <button
                            type="button"
                            class="sidebar-account-menu__item"
                            role="menuitem"
                            @click="openProfileDialog"
                        >
                            <i class="pi pi-user sidebar-account-menu__icon"></i>
                            <span>{{ $t('layout.account.profile') }}</span>
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            class="sidebar-account-menu__item"
                            role="menuitem"
                            @click="openSettings"
                        >
                            <i class="pi pi-cog sidebar-account-menu__icon"></i>
                            <span>{{ $t('layout.account.settings') }}</span>
                        </button>
                    </li>
                </ul>

                <div class="sidebar-account-menu__divider"></div>

                <ul class="sidebar-account-menu__list">
                    <li>
                        <button
                            type="button"
                            class="sidebar-account-menu__item sidebar-account-menu__item--danger"
                            role="menuitem"
                            @click="logout"
                        >
                            <i
                                class="pi pi-sign-out sidebar-account-menu__icon"
                            ></i>
                            <span>{{ $t('layout.account.logout') }}</span>
                        </button>
                    </li>
                </ul>
            </div>
        </Transition>

        <button
            type="button"
            class="sidebar-user-card"
            :class="{ 'sidebar-user-card--open': isOpen }"
            :aria-expanded="isOpen"
            aria-haspopup="menu"
            @click="toggleAccountMenu"
        >
            <span class="sidebar-user-card__avatar" aria-hidden="true">
                {{ userInitials }}
            </span>
            <span class="sidebar-user-card__copy">
                <span class="sidebar-user-card__name">
                    {{ userName }}
                </span>
                <span class="sidebar-user-card__role">
                    {{ userSubtitle || $t('layout.sidebar.member') }}
                </span>
            </span>
            <i
                class="pi sidebar-user-card__chevron"
                :class="isOpen ? 'pi-chevron-down' : 'pi-chevron-up'"
                aria-hidden="true"
            ></i>
        </button>
    </div>
</template>
