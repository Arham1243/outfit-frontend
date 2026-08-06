<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useGlobalStore, useSessionStore } from '@/stores';
import { RecaptchaV2, useRecaptcha } from 'vue3-recaptcha-v2';
import { getDeviceFingerprint, getDeviceInfo } from '@/utils/deviceFingerprint';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const globalStore = useGlobalStore();
const sessionStore = useSessionStore();
const { handleExecute, handleReset } = useRecaptcha();

const loading = ref(false);
const credentials = ref({
    email: '',
    password: '',
    remember_me: false
});

const PASSWORD_SETUP_NOTICES = {
    password_already_set: $t('auth.passwordSetup.passwordAlreadySet'),
    setup_link_invalid: $t('auth.passwordSetup.setupLinkInvalid')
};

const passwordNotice = ref('');

const recaptchaWidgetId = ref(null);
const recaptchaToken = ref('');
const recaptchaLoginQueued = ref(false);
const waitingForRecaptcha = ref(false);

const loginSubmitBlocked = computed(
    () =>
        loading.value ||
        waitingForRecaptcha.value ||
        recaptchaWidgetId.value == null
);

function applyPasswordNoticeFromRoute() {
    const key = route.query.notice;
    passwordNotice.value =
        typeof key === 'string' && PASSWORD_SETUP_NOTICES[key]
            ? PASSWORD_SETUP_NOTICES[key]
            : '';
}

onBeforeMount(() => {
    globalStore.clearErrors();
    applyPasswordNoticeFromRoute();
});

watch(
    () => route.query.notice,
    () => {
        applyPasswordNoticeFromRoute();
    }
);

function dismissPasswordNotice() {
    passwordNotice.value = '';
    if (route.query.notice) {
        const nextQuery = { ...route.query };
        delete nextQuery.notice;
        router.replace({ name: route.name, query: nextQuery });
    }
}

function resetRecaptcha() {
    recaptchaToken.value = '';
    if (recaptchaWidgetId.value != null) {
        try {
            handleReset(recaptchaWidgetId.value);
        } catch {
            // ignore
        }
    }
}

const submitLogin = async () => {
    if (!recaptchaToken.value) {
        return;
    }

    try {
        loading.value = true;

        const deviceFingerprint = getDeviceFingerprint();
        const deviceInfo = getDeviceInfo();

        const payload = {
            ...credentials.value,
            device_fingerprint: deviceFingerprint,
            device_info: deviceInfo
        };

        const response = await authStore.login(payload);

        if (response?.challenge === 'OTP_REQUIRED') {
            sessionStore.setEmail(credentials.value.email);
            await router.push({
                name: 'CodeVerification',
                query: {
                    session: response.session
                }
            });
            return;
        }

        await router.push({ name: 'Wardrobe' });
    } catch (e) {
        resetRecaptcha();
    } finally {
        loading.value = false;
    }
};

const onRecaptchaWidgetId = (id) => {
    recaptchaWidgetId.value = id;
};

const handleErrorCallback = () => {
    recaptchaLoginQueued.value = false;
    waitingForRecaptcha.value = false;
    globalStore.showError($t('recaptcha.title'), $t('recaptcha.loadFailed'));
};

const handleExpiredCallback = () => {
    recaptchaToken.value = '';
    recaptchaLoginQueued.value = false;
    waitingForRecaptcha.value = false;
    globalStore.showError($t('recaptcha.title'), $t('recaptcha.expired'));
};

const handleLoadCallback = (token) => {
    recaptchaToken.value = token;
    if (recaptchaLoginQueued.value) {
        recaptchaLoginQueued.value = false;
        waitingForRecaptcha.value = false;
        void submitLogin();
    }
};

const login = () => {
    if (recaptchaWidgetId.value == null) {
        globalStore.showError(
            $t('recaptcha.title'),
            $t('recaptcha.stillLoading')
        );
        return;
    }
    if (loading.value) {
        return;
    }

    recaptchaLoginQueued.value = true;
    waitingForRecaptcha.value = true;
    try {
        handleExecute(recaptchaWidgetId.value);
    } catch {
        recaptchaLoginQueued.value = false;
        waitingForRecaptcha.value = false;
        globalStore.showError(
            $t('recaptcha.title'),
            $t('recaptcha.couldNotStart')
        );
    }
};
</script>

<template>
    <div>
        <h4 class="text-3xl font-bold text-center mb-12">{{ $t('login') }}</h4>
        <Message
            v-if="passwordNotice"
            severity="info"
            class="mb-6 w-full"
            :closable="true"
            @close="dismissPasswordNotice"
        >
            {{ passwordNotice }}
        </Message>
        <form @submit.prevent="login">
            <div class="grid">
                <div class="mb-6 col-span-12">
                    <label class="block mb-2" for="email">
                        {{ $t('email') }}
                    </label>
                    <InputField
                        variant="text"
                        id="email"
                        v-model="credentials.email"
                        class="w-full"
                    />
                </div>

                <div class="mb-4 col-span-12">
                    <label class="block mb-2" for="password">
                        {{ $t('password') }}
                    </label>
                    <InputField
                        id="password"
                        variant="password"
                        v-model="credentials.password"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>
            </div>

            <div class="flex justify-between items-center pt-1">
                <div class="flex items-center">
                    <InputField
                        variant="checkbox"
                        v-model="credentials.remember_me"
                        binary
                        inputId="remember"
                    />
                    <label for="remember" class="ml-2 cursor-pointer">
                        {{ $t('remember_me') }}
                    </label>
                </div>
                <router-link
                    class="primary-text"
                    :to="{ name: 'Password Reset Request' }"
                >
                    {{ $t('forgot_password') }}
                </router-link>
            </div>

            <RecaptchaV2
                size="invisible"
                @widget-id="onRecaptchaWidgetId"
                @error-callback="handleErrorCallback"
                @expired-callback="handleExpiredCallback"
                @load-callback="handleLoadCallback"
            />

            <Button
                class="w-full left-loading mt-5"
                :label="$t('login')"
                :disabled="loginSubmitBlocked"
                :loading="loading || waitingForRecaptcha"
                type="submit"
            />
        </form>
    </div>
</template>
