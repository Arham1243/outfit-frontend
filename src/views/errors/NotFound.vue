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
                {{ $t('404') }}
            </div>
            <div class="error-page-title text-xl font-semibold uppercase mb-4">
                {{ $t('page_not_found') }}
            </div>
            <p class="error-page-message">
                {{ $t('sorry_we_cant_find_the_content_youre_looking_for') }}
            </p>

            <Button variant="outlined" class="w-72" @click="goHome">
                {{ $t('go_home') }}
            </Button>
        </div>
    </div>
</template>
