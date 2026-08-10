<script setup>
import { onMounted } from 'vue';
import {
    ensureAppearanceListener,
    setAppearance
} from '@/layout/composables/layout';

onMounted(() => {
    ensureAppearanceListener();
    // Temporary: force light mode for auth UI testing.
    setAppearance('light', { persist: false });
});
</script>

<template>
    <div class="auth-layout">
        <div class="auth-layout__brand">{{ $t('layout.sidebar.brand') }}</div>

        <div class="auth-layout__inner">
            <router-view />

            <footer class="auth-layout__footer">
                <a href="#" rel="noopener">{{ $t('terms_of_use') }}</a>
                <span class="auth-layout__footer-sep" aria-hidden="true"
                    >|</span
                >
                <a href="#" rel="noopener">{{ $t('privacy_policy') }}</a>
            </footer>
        </div>
        <Toast />
    </div>
</template>
