<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';
import { AuthService } from '@/services';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
const checkingToken = ref(true);
const formData = ref({
    password: '',
    password_confirmation: ''
});

const rules = ref({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
});

const validatePassword = () => {
    const password = formData.value.password;

    rules.value.minLength = password.length >= 8;
    rules.value.uppercase = /[A-Z]/.test(password);
    rules.value.lowercase = /[a-z]/.test(password);
    rules.value.number = /[0-9]/.test(password);
    rules.value.symbol = /[@$!%*#?&]/.test(password);
};

const isPasswordValid = computed(
    () =>
        rules.value.minLength &&
        rules.value.uppercase &&
        rules.value.lowercase &&
        rules.value.number &&
        rules.value.symbol
);

function redirectToLoginInvalidResetLink() {
    router.replace({
        name: 'Login',
        query: { notice: 'reset_link_invalid' }
    });
}

onBeforeMount(async () => {
    const token = route.query.token;
    if (!token || typeof token !== 'string') {
        redirectToLoginInvalidResetLink();
        return;
    }

    try {
        const { data } = await AuthService.setupPasswordTokenStatus(token);
        if (data?.status !== 'valid') {
            redirectToLoginInvalidResetLink();
            return;
        }
        checkingToken.value = false;
    } catch (e) {
        redirectToLoginInvalidResetLink();
    }
});

const handleSubmit = async () => {
    try {
        loading.value = true;
        const payload = {
            ...formData.value,
            token: route.query.token
        };
        await authStore.resetPassword(payload);
        pushRoute('Login');
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
};

const pushRoute = (name) => {
    router.push({ name });
};
</script>
<template>
    <div v-if="!checkingToken">
        <h1 class="auth-title">{{ $t('reset_password') }}</h1>
        <p class="auth-subtitle">{{ $t('auth.passwordReset.subtitle') }}</p>

        <form @submit.prevent="handleSubmit">
            <div
                class="auth-field"
                :class="{ 'auth-field--float': !!formData.password }"
            >
                <label class="auth-float-label" for="password">{{
                    $t('new_password')
                }}</label>
                <InputField
                    id="password"
                    variant="password"
                    v-model="formData.password"
                    class="w-full"
                    inputClass="w-full"
                    toggleMask
                    autocomplete="new-password"
                    placeholder=" "
                    @input="validatePassword"
                    :feedback="false"
                    :disabled="loading"
                />
            </div>

            <div
                class="auth-field"
                :class="{
                    'auth-field--float': !!formData.password_confirmation
                }"
            >
                <label class="auth-float-label" for="password_confirmation">{{
                    $t('confirm_password')
                }}</label>
                <InputField
                    data-testid-icon="confirm-password-icon"
                    id="password_confirmation"
                    variant="password"
                    v-model="formData.password_confirmation"
                    class="w-full"
                    inputClass="w-full"
                    toggleMask
                    autocomplete="new-password"
                    placeholder=" "
                    :feedback="false"
                    :disabled="loading"
                />
            </div>

            <div class="auth-rules mb-4">
                <label class="font-semibold mb-3 block text-sm">{{
                    $t('password_must_contain_the_following')
                }}</label>
                <div class="space-y-1">
                    <div
                        :class="[
                            'font-medium !mb-2',
                            {
                                valid: rules.minLength,
                                invalid: !rules.minLength
                            }
                        ]"
                    >
                        <span class="pl-3">{{
                            $t('at_least_8_characters')
                        }}</span>
                    </div>
                    <div
                        :class="[
                            'font-medium !mb-2',
                            {
                                valid: rules.uppercase,
                                invalid: !rules.uppercase
                            }
                        ]"
                    >
                        <span class="pl-3">{{
                            $t('one_upper_case_letter')
                        }}</span>
                    </div>
                    <div
                        :class="[
                            'font-medium !mb-2',
                            {
                                valid: rules.lowercase,
                                invalid: !rules.lowercase
                            }
                        ]"
                    >
                        <span class="pl-3">{{
                            $t('one_lower_case_letter')
                        }}</span>
                    </div>
                    <div
                        :class="[
                            'font-medium !mb-2',
                            { valid: rules.number, invalid: !rules.number }
                        ]"
                    >
                        <span class="pl-3">{{
                            $t('at_least_one_number')
                        }}</span>
                    </div>
                    <div
                        :class="[
                            'font-medium !mb-2',
                            { valid: rules.symbol, invalid: !rules.symbol }
                        ]"
                    >
                        <span class="pl-3">{{
                            $t('at_least_one_symbol')
                        }}</span>
                    </div>
                </div>
            </div>

            <Button
                :disabled="!isPasswordValid || loading"
                :label="$t('reset_password')"
                class="auth-submit left-loading"
                :loading="loading"
                type="submit"
            />
        </form>
    </div>
</template>
<style lang="scss" scoped>
.valid,
.valid::before {
    color: #0e4f26;
}
.valid::before {
    content: '\e909';
    font-family: 'PrimeIcons';
}
.invalid,
.invalid::before {
    color: #b32b23;
}
.invalid::before {
    content: '\e90b';
    font-family: 'PrimeIcons';
}
</style>
