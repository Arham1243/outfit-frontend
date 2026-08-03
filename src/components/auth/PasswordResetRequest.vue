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
        <h4 class="text-3xl font-bold text-center mb-4">
            {{ $t('forgot_password') }}
        </h4>

        <p class="text-center mb-12 text-gray-700">
            {{
                $t(
                    'enter_your_email_address_and_well_send_you_a_link_to_reset_your_password'
                )
            }}
        </p>

        <form @submit.prevent="handleSubmit">
            <div class="grid mb-3">
                <div class="mb-6 col-span-12">
                    <label for="email" class="block mb-2">{{
                        $t('email')
                    }}</label>
                    <InputField
                        id="email"
                        v-model="email"
                        variant="text"
                        class="w-full"
                    />
                </div>
            </div>

            <Button
                class="w-full left-loading mb-4"
                :label="$t('continue')"
                :disabled="!email || loading"
                :loading="loading"
                type="submit"
            />
            <Button
                variant="outlined"
                class="w-full left-loading"
                :label="$t('back_to_login')"
                :disabled="loading"
                @click="goBack"
                type="button"
            />
        </form>
    </div>
</template>
