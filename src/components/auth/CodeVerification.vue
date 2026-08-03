<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore, useSessionStore } from '@/stores';
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import OtpInput from 'vue3-otp-input';
import { getDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const sessionStore = useSessionStore();

const loading = ref(false);
const isResendingOtp = ref(false);
const otpKey = ref('');
const code = ref('');
const session = ref(route.query.session);
const otpInputError = ref(false);

const otpInputClasses = computed(() =>
    otpInputError.value ? 'otp-input otp-input--error' : 'otp-input'
);

watch(code, (newValue) => {
    otpInputError.value = false;
    if (newValue.length === 6 && !loading.value) {
        verifyCode();
    }
});
const verificationMessage = computed(() => {
    const contactInfo = sessionStore.getEmail();

    return $t('auth.otp.verificationMessage', {
        email: contactInfo
    });
});
const isCodeValid = computed(() => {
    return code.value.length === 6;
});

const verifyCode = async () => {
    try {
        otpInputError.value = false;
        loading.value = true;

        // Get device fingerprint and info
        const deviceFingerprint = getDeviceFingerprint();
        const deviceInfo = getDeviceInfo();

        const payload = {
            otp_code: code.value,
            session: session.value,
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo
        };

        const result = await authStore.verifyOtp(payload);
        sessionStorage.removeItem('email');
        await router.push({ name: 'Wardrobe' });
    } catch (e) {
        otpInputError.value = true;
        // Errors are handled by globalStore
        console.error('OTP verification failed:', e);
    } finally {
        loading.value = false;
    }
};

const handleResendOtp = async () => {
    try {
        isResendingOtp.value = true;

        const payload = {
            session: session.value
        };

        const response = await authStore.resendOtp(payload);

        // Update session token with new one
        if (response.session) {
            session.value = response.session;
            router.replace({
                query: {
                    ...route.query,
                    session: session.value
                }
            });
        }

        // Reset OTP input
        otpInputError.value = false;
        code.value = '';
        otpKey.value = Date.now().toString();
    } catch (e) {
        console.error('Resend OTP failed:', e);
    } finally {
        isResendingOtp.value = false;
    }
};
</script>
<template>
    <div>
        <h4 class="font-bold text-3xl text-center" data-testid="page-title">
            {{ $t('otp_verification') }}
        </h4>
        <p class="text-center pt-2 pb-2" data-testid="page-subtitle">
            {{ verificationMessage }}
        </p>
        <form @submit.prevent="verifyCode">
            <div class="grid grid-cols-12 gap-4 mt-6 mb-4">
                <div class="col-span-12">
                    <OtpInput
                        :key="otpKey"
                        :input-classes="otpInputClasses"
                        inputType="number"
                        :num-inputs="6"
                        v-model:value="code"
                        data-testid="otp-input"
                        :should-auto-focus="true"
                        :should-focus-order="true"
                    />
                </div>
            </div>
            <div class="flex items-center justify-center pb-5">
                <div class="flex items-center text-base font-bold">
                    <span
                        class="d-flex text-surface-600 dark:text-surface-200"
                        data-testid="not-receive-text"
                    >
                        {{ $t('didn_t_receive_the_otp') }}
                    </span>
                    <Button
                        data-testid="resend-button"
                        link
                        class="!px-1 !py-1 underline text-base text-primary"
                        :loading="isResendingOtp"
                        @click="handleResendOtp"
                        :label="$t('resend')"
                    />
                </div>
            </div>
            <div class="flex flex-col flex-wrap gap-12 justify-between">
                <Button
                    :disabled="!isCodeValid || loading"
                    data-testid="verify-button"
                    :label="$t('verify')"
                    class="w-full left-loading"
                    :loading="loading"
                    type="submit"
                />
            </div>
        </form>
    </div>
</template>
<style>
.otp-input-container {
    gap: 1rem;
    justify-content: center;
    padding-inline: 0.35rem;
}

.otp-input {
    width: 50px;
    height: 54px;
    padding: 5px;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    text-align: center;
    font-size: 1.1rem;
    outline: none;
}

.otp-input:hover {
    border-color: #14377d;
}

.otp-input--error {
    border-color: #ef4444;
}

.otp-input--error:hover {
    border-color: #dc2626;
}
</style>
