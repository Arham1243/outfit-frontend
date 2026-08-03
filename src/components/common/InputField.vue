<script setup>
import RawField from './RawField.vue';
import { computed } from 'vue';
import { useGlobalStore } from '@/stores';

const globalStore = useGlobalStore();

const props = defineProps({
    id: {
        type: String
    },
    /** Laravel validation key; defaults to `id` when omitted */
    errorKey: {
        type: String
    },
    iconBefore: {
        type: String
    },
    iconAfter: {
        type: String
    },
    addonBefore: {
        type: String
    },
    addonAfter: {
        type: String
    },
    dataTestidIcon: {
        type: String
    },
    errorMessages: {
        type: [String, Array]
    }
});

const emit = defineEmits(['iconBeforeClick', 'iconAfterClick']);

const fieldKey = computed(() => props.errorKey || props.id || '');

const normalizeErrors = (value) => {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
};

const resolveStoreErrors = (key) => {
    const storeErrors = globalStore.errors;
    if (!storeErrors || !key) {
        return [];
    }

    const keysToTry = [key, `${key}.en`];
    if (key.startsWith('recurring_')) {
        keysToTry.push(key.slice('recurring_'.length));
    }

    for (const candidate of keysToTry) {
        if (storeErrors[candidate]) {
            return normalizeErrors(storeErrors[candidate]);
        }
    }

    return [];
};

const errors = computed(() => {
    if (props.errorMessages && Array.isArray(props.errorMessages)) {
        return props.errorMessages;
    }
    if (props.errorMessages && typeof props.errorMessages === 'string') {
        return [props.errorMessages];
    }
    return resolveStoreErrors(fieldKey.value);
});

const errorElementId = (index) => {
    const key = fieldKey.value || 'field';
    return index === 0 ? `${key}-error` : `${key}-error-${index}`;
};

const hasError = computed(() => errors.value.length > 0);

const fieldWrapperClass = computed(() => ({
    'input-field-wrap--invalid': hasError.value
}));
</script>

<template>
    <span
        v-if="iconBefore || iconAfter"
        class="input-field-wrap"
        :class="[
            fieldWrapperClass,
            {
                'p-input-icon-left': iconBefore,
                'p-input-icon-right': iconAfter
            }
        ]"
    >
        <i
            v-if="iconBefore"
            :class="iconBefore"
            :data-testid="dataTestidIcon"
            @click.stop="emit('iconBeforeClick')"
        />
        <RawField v-bind="$attrs" :id="id" :invalid="hasError" />
        <i
            v-if="iconAfter"
            class="cursor-pointer"
            :data-testid="dataTestidIcon"
            :class="iconAfter"
            @click.stop="emit('iconAfterClick')"
        />
    </span>

    <div
        v-else-if="addonBefore || addonAfter"
        class="p-inputgroup input-field-wrap"
        :class="fieldWrapperClass"
    >
        <span v-if="addonBefore" class="p-inputgroup-addon">
            <i
                :data-testid="dataTestidIcon"
                v-if="addonBefore.includes('pi')"
                :class="addonBefore"
            ></i>
            <span v-else>{{ addonBefore }}</span>
        </span>
        <RawField v-bind="$attrs" :id="id" :invalid="hasError" />
        <span v-if="addonAfter" class="p-inputgroup-addon">
            <i
                :data-testid="dataTestidIcon"
                v-if="addonAfter.includes('pi')"
                :class="addonAfter"
            ></i>
            <span v-else>{{ addonAfter }}</span>
        </span>
    </div>

    <div v-else class="input-field-wrap" :class="fieldWrapperClass">
        <RawField v-bind="$attrs" :id="id" :invalid="hasError" />
    </div>

    <small
        v-for="(error, index) in errors"
        :key="index"
        class="mt-[0.35rem] text-[84%] block text-[#e24c4c]"
        :class="{ 'mb-2': index == errors.length - 1 }"
        :id="errorElementId(index)"
        :data-testid="`validation-error-${fieldKey || 'field'}`"
    >
        {{ error }}
    </small>
</template>

<style lang="scss" scoped>
$field-error-color: #e24c4c;

.input-field-wrap--invalid {
    :deep(.p-inputtext),
    :deep(.p-inputnumber-input),
    :deep(.p-textarea),
    :deep(.p-select),
    :deep(.p-select-label),
    :deep(.p-autocomplete-input),
    :deep(.mx-input),
    :deep(.date-field--invalid .mx-input),
    :deep(input:not([type='checkbox']):not([type='radio'])) {
        border-color: $field-error-color !important;
        color: $field-error-color !important;
    }

    :deep(.p-select.p-invalid),
    :deep(.p-inputtext.p-invalid),
    :deep(.p-inputnumber.p-invalid) {
        border-color: $field-error-color !important;
    }
}
</style>
