<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores';
import { AuthService } from '@/services';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);
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

function redirectToLoginPasswordNotice() {
    router.replace({
        name: 'Login',
        query: { notice: 'password_already_set' }
    });
}

function redirectToLoginInvalidSetupLink() {
    router.replace({
        name: 'Login',
        query: { notice: 'setup_link_invalid' }
    });
}

onBeforeMount(async () => {
    const token = route.query.token;
    if (!token || typeof token !== 'string') {
        redirectToLoginInvalidSetupLink();

        return;
    }
    try {
        const { data } = await AuthService.setupPasswordTokenStatus(token);
        if (data?.status === 'already_set') {
            redirectToLoginPasswordNotice();

            return;
        }
        if (data?.status !== 'valid') {
            redirectToLoginInvalidSetupLink();

            return;
        }
    } catch (e) {
        const payload = e?.response?.data ?? {};
        const st = typeof payload.status === 'string' ? payload.status : '';
        if (st === 'already_set') {
            redirectToLoginPasswordNotice();

            return;
        }
        redirectToLoginInvalidSetupLink();
    }
});

const handleSubmit = async () => {
    try {
        loading.value = true;
        const payload = {
            ...formData.value,
            token: route.query.token
        };
        const result = await authStore.setupPassword(payload);
        await router.push({ name: 'Wardrobe' });
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
};
</script>
<template>
    <div>
        <h4 class="text-3xl font-bold text-center mb-12">
            {{ $t('lets_set_a_password_for_your_account') }}
        </h4>

        <form @submit.prevent="handleSubmit">
            <div class="grid">
                <div class="mb-6 col-span-12">
                    <label class="block !mb-2" for="password">{{
                        $t('password')
                    }}</label>
                    <InputField
                        id="password"
                        variant="password"
                        v-model="formData.password"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        @input="validatePassword"
                        :feedback="false"
                    />
                </div>

                <div class="mb-6 col-span-12">
                    <label class="block !mb-2" for="password_confirmation">{{
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
                        :feedback="false"
                    />
                </div>

                <div class="mb-6 col-span-12 mt-3">
                    <label class="font-semibold mb-4 block">{{
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
            </div>

            <div class="pt-4">
                <Button
                    :disabled="!isPasswordValid || loading"
                    :label="$t('set_password')"
                    class="w-full left-loading"
                    :loading="loading"
                    type="submit"
                />
            </div>
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
