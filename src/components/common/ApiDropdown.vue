<script setup>
import { ref, watch, onMounted, useAttrs, computed } from 'vue';
import { debounce } from 'lodash-es';
import { useGlobalStore } from '@/stores';

defineOptions({ inheritAttrs: false });

const globalStore = useGlobalStore();
const attrs = useAttrs();

const props = defineProps({
    modelValue: [String, Number, Object],
    options: { type: Array, default: () => [] },
    id: {
        type: String
    },
    errorKey: {
        type: String
    },
    errorMessages: {
        type: [String, Array],
        default: undefined
    },
    loading: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: undefined
    }
});

const emit = defineEmits(['update:modelValue', 'search', 'change']);

const selected = ref(props.modelValue);
const localOptions = ref(props.options);
const currentSearch = ref('');

watch(
    () => props.modelValue,
    (val) => {
        selected.value = val;
    }
);

watch(
    () => props.options,
    (val) => (localOptions.value = val)
);

const onChange = (event) => {
    emit('update:modelValue', event.value);
    emit('change', event);
};

const onFilter = debounce((event) => {
    const filterValue = event.value ?? '';
    currentSearch.value = filterValue;
    emit('search', filterValue);
}, 300);

onMounted(() => {
    if (!localOptions.value.length) {
        emit('search', '');
    }
});

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

const hasError = computed(() => errors.value.length > 0);

const fieldErrorColor = '#e24c4c';

const selectPt = computed(() => {
    if (!hasError.value) {
        return undefined;
    }

    return {
        root: {
            style: {
                borderColor: fieldErrorColor,
                borderWidth: '1px',
                borderStyle: 'solid'
            }
        },
        label: {
            style: { color: fieldErrorColor }
        },
        dropdownIcon: {
            style: { color: fieldErrorColor }
        }
    };
});

const errorElementId = (index) => {
    const key = fieldKey.value || 'field';
    return index === 0 ? `${key}-error` : `${key}-error-${index}`;
};

const passthroughAttrs = computed(() => {
    const {
        loading: _loading,
        disabled: _disabled,
        placeholder: _placeholder,
        ...rest
    } = attrs;

    return rest;
});

const resolvedPlaceholder = computed(
    () => props.placeholder ?? attrs.placeholder ?? $t('select')
);

const isDisabled = computed(
    () =>
        props.disabled ||
        attrs.disabled ||
        props.loading ||
        attrs.loading
);
</script>

<template>
    <div
        class="input-field-wrap w-full"
        :class="{ 'input-field-wrap--invalid': hasError }"
    >
        <Select
            v-model="selected"
            :options="localOptions"
            v-bind="passthroughAttrs"
            :inputId="id"
            :invalid="hasError"
            :pt="selectPt"
            :placeholder="resolvedPlaceholder"
            :loading="loading"
            :disabled="isDisabled"
            class="w-full"
            :class="{ 'p-invalid': hasError }"
            @change="onChange"
            @filter="onFilter"
        >
            <template
                v-for="(_, name) in $slots"
                #[name]="slotData"
                :key="name"
            >
                <slot :name="name" v-bind="slotData || {}" />
            </template>
        </Select>
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
    </div>
</template>
