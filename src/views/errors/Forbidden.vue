<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
    router.push({ name: 'Wardrobe' });
};
</script>

<template>
    <div
        class="error-page-shell w-screen h-screen flex items-center justify-center overflow-x-hidden"
    >
        <div class="error-page-card p-12 max-w-2xl w-full text-center">
            <div class="error-page-code text-6xl font-bold mb-4">
                {{ $t('403') }}
            </div>
            <div class="error-page-title text-xl font-semibold uppercase mb-4">
                {{ $t('access_denied') }}
            </div>
            <p class="error-page-message">
                {{ $t('sorry_you_dont_have_permission_to_access_this_page') }}
            </p>

            <Button variant="outlined" class="w-72" @click="goHome">
                {{ $t('go_home') }}
            </Button>
        </div>
    </div>
</template>
