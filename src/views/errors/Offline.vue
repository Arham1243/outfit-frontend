<script setup>
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const goHome = () => {
    router.push({ name: 'Wardrobe' });
};

const tryAgain = () => {
    if (navigator.onLine) {
        const redirect = route.query.redirect;
        if (typeof redirect === 'string' && redirect.length > 0) {
            router.push(redirect);
            return;
        }
        goHome();
        return;
    }

    window.location.reload();
};
</script>

<template>
    <div
        class="error-page-shell w-screen h-screen flex items-center justify-center overflow-x-hidden"
    >
        <div class="error-page-card p-12 max-w-2xl w-full text-center">
            <div class="error-page-code text-6xl font-bold mb-4">
                {{ $t('offline') }}
            </div>
            <div class="error-page-title text-xl font-semibold uppercase mb-4">
                {{ $t('no_internet_connection') }}
            </div>
            <p class="error-page-message">
                {{
                    $t(
                        'it_looks_like_youre_offline_check_your_connection_and_try_again'
                    )
                }}
            </p>

            <div class="flex flex-col items-center gap-3">
                <Button variant="outlined" class="w-72" @click="tryAgain">
                    {{ $t('try_again') }}
                </Button>
                <Button
                    severity="secondary"
                    variant="text"
                    class="w-72"
                    @click="goHome"
                >
                    {{ $t('go_home') }}
                </Button>
            </div>
        </div>
    </div>
</template>
