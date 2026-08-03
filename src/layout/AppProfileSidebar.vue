<script setup>
import { setDarkTheme, useLayout } from '@/layout/composables/layout';
import { useSessionStore, useAuthStore } from '@/stores';
import { useRouter } from 'vue-router';

const { layoutState } = useLayout();

const sessionStore = useSessionStore();
const router = useRouter();
const authStore = useAuthStore();
const currentUser = sessionStore.user;

function removeDarkMode() {
    setDarkTheme(false);
}

const logout = async () => {
    try {
        await authStore.logout();
    } finally {
        removeDarkMode();
        sessionStore.clearSessionState();
        pushRoute('Login');
    }
};

const pushRoute = (name) => {
    router.push({ name });
};

const goToProfile = () => {
    pushRoute('Profile');
    layoutState.profileSidebarVisible = false;
};
</script>

<template>
    <Drawer
        v-model:visible="layoutState.profileSidebarVisible"
        position="right"
        class="layout-profile-sidebar w-full sm:w-[25rem]"
        :showCloseIcon="false"
    >
        <template #header>
            <div class="flex justify-end items-center w-full">
                <Button
                    icon="pi pi-times"
                    variant="text"
                    class="p-button-text p-button-rounded"
                    @click="layoutState.profileSidebarVisible = false"
                />
            </div>
        </template>

        <div class="flex flex-col mx-auto md:mx-0">
            <span class="mb-2 font-semibold">{{ $t('welcome') }}</span>

            <span
                class="text-surface-500 dark:text-surface-400 font-medium mb-8"
                >{{ currentUser?.name }}</span
            >

            <ul class="list-none m-0 p-0">
                <li @click="goToProfile">
                    <a
                        class="cursor-pointer flex mb-4 py-3 px-4 items-center border border-surface-200 dark:border-surface-700 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150"
                    >
                        <span>
                            <i class="pi pi-user text-xl text-primary dark:!text-white"></i>
                        </span>
                        <div class="ml-4">
                            <span class="mb-2 font-semibold">{{
                                $t('profile')
                            }}</span>
                        </div>
                    </a>
                </li>
                <li @click="logout">
                    <a
                        class="cursor-pointer flex mb-4 py-3 px-4 items-center border border-surface-200 dark:border-surface-700 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-150"
                    >
                        <span>
                            <i class="pi pi-power-off text-xl text-primary dark:!text-white"></i>
                        </span>
                        <div class="ml-4">
                            <span class="mb-2 font-semibold">{{
                                $t('sign_out')
                            }}</span>
                        </div>
                    </a>
                </li>
            </ul>
        </div>
    </Drawer>
</template>
