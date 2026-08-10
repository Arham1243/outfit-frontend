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

const userProfileImage = computed(
    () => sessionStore.user?.profile_image ?? null
);

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
                <ul class="sidebar-account-menu__list">
                    <li>
                        <button
                            type="button"
                            class="sidebar-account-menu__item"
                            role="menuitem"
                            @click="openProfileDialog"
                        >
                            <i
                                class="pi pi-user sidebar-account-menu__icon"
                                aria-hidden="true"
                            ></i>
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
                            <i
                                class="pi pi-cog sidebar-account-menu__icon"
                                aria-hidden="true"
                            ></i>
                            <span>{{ $t('layout.account.settings') }}</span>
                        </button>
                    </li>
                </ul>

                <div class="sidebar-account-menu__divider"></div>

                <ul class="sidebar-account-menu__list">
                    <li>
                        <button
                            type="button"
                            class="sidebar-account-menu__item"
                            role="menuitem"
                            @click="logout"
                        >
                            <i
                                class="pi pi-sign-out sidebar-account-menu__icon"
                                aria-hidden="true"
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
                <img
                    v-if="userProfileImage"
                    :src="userProfileImage"
                    :alt="userName"
                    class="sidebar-user-card__avatar-image"
                />
                <span v-else class="sidebar-user-card__avatar-initials">
                    {{ userInitials }}
                </span>
            </span>
            <span class="sidebar-user-card__copy">
                <span class="sidebar-user-card__name">
                    {{ userName }}
                </span>
                <span class="sidebar-user-card__role">
                    {{ userSubtitle || $t('layout.sidebar.free_plan') }}
                </span>
            </span>
            <i
                class="pi pi-sliders-h sidebar-user-card__icon"
                aria-hidden="true"
            ></i>
        </button>
    </div>
</template>
