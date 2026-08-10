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

const formBusy = computed(() => loading.value || isResendingOtp.value);

const otpInputClasses = computed(() =>
    [
        'otp-input',
        otpInputError.value ? 'otp-input--error' : '',
        formBusy.value ? 'otp-input--disabled' : ''
    ]
        .filter(Boolean)
        .join(' ')
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
        <h1 class="auth-title" data-testid="page-title">
            {{ $t('otp_verification') }}
        </h1>
        <p class="auth-subtitle" data-testid="page-subtitle">
            {{ verificationMessage }}
        </p>
        <form @submit.prevent="verifyCode">
            <div
                class="mt-2 mb-4"
                :class="{ 'otp-input-wrap--disabled': formBusy }"
            >
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
            <div class="flex items-center justify-center pb-2">
                <div class="flex items-center text-sm">
                    <span
                        class="text-[var(--auth-muted,#6e6e80)]"
                        data-testid="not-receive-text"
                    >
                        {{ $t('didn_t_receive_the_otp') }}
                    </span>
                    <Button
                        data-testid="resend-button"
                        link
                        class="!px-1 !py-1 underline text-sm !text-[var(--auth-text,#0d0d0d)]"
                        :loading="isResendingOtp"
                        :disabled="formBusy"
                        @click="handleResendOtp"
                        :label="$t('resend')"
                    />
                </div>
            </div>
            <Button
                :disabled="!isCodeValid || formBusy"
                data-testid="verify-button"
                :label="$t('verify')"
                class="auth-submit left-loading"
                :loading="loading"
                type="submit"
            />
        </form>
    </div>
</template>
<style>
.otp-input-container {
    gap: 0.65rem;
    justify-content: center;
    padding-inline: 0.15rem;
}

.otp-input {
    width: 2.75rem;
    height: 3.15rem;
    padding: 5px;
    border-radius: 0.85rem;
    border: 1px solid #c2c2c2;
    text-align: center;
    font-size: 1.1rem;
    outline: none;
    background: #fff;
    color: #0d0d0d;
}

.otp-input:hover {
    border-color: #0d0d0d;
}

.otp-input:focus {
    border-color: #0d0d0d;
    box-shadow: 0 0 0 1px #0d0d0d;
}

.otp-input--error {
    border-color: #ef4444;
}

.otp-input--error:hover {
    border-color: #dc2626;
}

.otp-input-wrap--disabled {
    pointer-events: none;
    opacity: 0.55;
}

.otp-input--disabled {
    cursor: not-allowed;
    background: #f5f5f5;
}
</style>
