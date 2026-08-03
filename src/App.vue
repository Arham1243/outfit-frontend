<script setup>
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

import { useVersionCheck } from '@/composables/useVersionCheck';

const router = useRouter();
const route = useRoute();
const { locale } = useI18n();
useVersionCheck();

// Set HTML lang and dir attributes based on locale
const updateHtmlAttributes = () => {
    document.documentElement.setAttribute('lang', locale.value);

    // Set direction for RTL languages
    const rtlLocales = [
        'ar',
        'he',
        'fa',
        'ur',
        'dv',
        'ps',
        'sd',
        'yi',
        'ug',
        'ks',
        'ku'
    ];
    const dir = rtlLocales.includes(locale.value) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
};

// Update on mount and when locale changes
onMounted(() => {
    updateHtmlAttributes();
});

watch(locale, () => {
    updateHtmlAttributes();
});

const handleOffline = () => {
    if (route.name === 'Offline') return;
    router.push({ name: 'Offline', query: { redirect: route.fullPath } });
};

const handleOnline = () => {
    if (route.name !== 'Offline') return;
    const redirect = route.query.redirect;
    if (typeof redirect === 'string' && redirect.length > 0) {
        router.replace(redirect);
        return;
    }
    router.replace({ name: 'Wardrobe' });
};

onMounted(() => {
    if (!navigator.onLine) {
        handleOffline();
    }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
});

onBeforeUnmount(() => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
});
</script>

<template>
    <router-view />
</template>

<style scoped></style>
