<script setup>
import { onBeforeMount, ref } from 'vue';
import { useAuthStore, useGlobalStore } from '@/stores';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const globalStore = useGlobalStore();
const loading = ref(false);
const email = ref(null);

onBeforeMount(() => {
    globalStore.clearErrors();
});

const handleSubmit = async () => {
    try {
        loading.value = true;
        const res = await authStore.forgotPassword({ email: email.value });
        if (res?.status === true) {
            email.value = '';
            globalStore.clearErrors();
        }
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
};
const goBack = () => {
    router.push({ name: 'Login' });
};
</script>
<template>
    <div>
        <h1 class="auth-title">{{ $t('forgot_password') }}</h1>
        <p class="auth-subtitle">
            {{
                $t(
                    'enter_your_email_address_and_well_send_you_a_link_to_reset_your_password'
                )
            }}
        </p>

        <form @submit.prevent="handleSubmit">
            <div class="auth-field" :class="{ 'auth-field--float': !!email }">
                <label class="auth-float-label" for="email">{{
                    $t('email_address')
                }}</label>
                <InputField
                    id="email"
                    v-model="email"
                    variant="text"
                    autocomplete="email"
                    placeholder=" "
                    class="w-full"
                    :disabled="loading"
                />
            </div>

            <Button
                class="auth-submit left-loading"
                :label="$t('continue')"
                :disabled="!email || loading"
                :loading="loading"
                type="submit"
            />
            <Button
                class="auth-submit-secondary left-loading"
                :label="$t('back_to_login')"
                :disabled="loading"
                @click="goBack"
                type="button"
            />
        </form>
    </div>
</template>
