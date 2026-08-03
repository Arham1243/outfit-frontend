<script setup>
import { ref, watch, computed, getCurrentInstance } from 'vue';
import { useGlobalStore } from '@/stores';

const globalStore = useGlobalStore();

const props = defineProps({
    id: {
        type: String
    },
    modelValue: {
        type: Array,
        default: () => []
    },
    disabled: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: ''
    },
    errorMessages: {
        type: [String, Array]
    },
    helperText: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:modelValue']);

const localValue = ref([...props.modelValue]);
const previousBcc = ref([...props.modelValue]);
const localErrors = ref([]);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resolvedPlaceholder = computed(
    () => props.placeholder || $t('common.placeholders.addRecipients')
);
const resolvedHelperText = computed(
    () => props.helperText || $t('common.placeholders.typeEmailToAdd')
);

// Watch for external changes to modelValue
watch(
    () => props.modelValue,
    (newValue) => {
        localValue.value = [...newValue];
        previousBcc.value = [...newValue];
    }
);

// Validate emails when they are added
watch(localValue, (newValues, oldValues) => {
    if (JSON.stringify(newValues) === JSON.stringify(oldValues)) return;

    const addedEmails = newValues.filter((e) => !previousBcc.value.includes(e));

    addedEmails.forEach((email) => {
        if (!emailRegex.test(email.trim())) {
            localValue.value = localValue.value.filter((e) => e !== email);
            const errorMsg = $t('common.bcc.invalidEmail', { email });
            if (!localErrors.value.includes(errorMsg)) {
                localErrors.value.push(errorMsg);
                setTimeout(() => {
                    localErrors.value = localErrors.value.filter(
                        (e) => e !== errorMsg
                    );
                }, 5000);
            }
        }
    });

    previousBcc.value = [...localValue.value];
    emit('update:modelValue', localValue.value);
});

// Combine local validation errors with backend errors
const errors = computed(() => {
    const backendErrors = [];

    if (props.errorMessages && Array.isArray(props.errorMessages)) {
        backendErrors.push(...props.errorMessages);
    } else if (props.errorMessages && typeof props.errorMessages === 'string') {
        backendErrors.push(props.errorMessages);
    } else if (globalStore.errors && props.id) {
        if (globalStore.errors[props.id]) {
            backendErrors.push(...globalStore.errors[props.id]);
        }
    }

    return [...localErrors.value, ...backendErrors];
});
</script>

<template>
    <div>
        <AutoComplete
            v-model="localValue"
            multiple
            :typeahead="false"
            :disabled="disabled"
            :placeholder="resolvedPlaceholder"
            class="w-full"
        />

        <small v-if="resolvedHelperText" class="text-gray-500 block my-2">
            {{ resolvedHelperText }}
        </small>

        <small
            v-for="(error, index) in errors"
            :key="index"
            class="mt-[0.35rem] text-[84%] block text-[#e24c4c]"
            id="text-error"
            data-testid="validation-error"
        >
            {{ error }}
        </small>
    </div>
</template>

<style lang="scss" scoped></style>
