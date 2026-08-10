<script setup>
import { computed, unref } from 'vue';
import TableTextFilter from './TableTextFilter.vue';
import TableSelectFilter from './TableSelectFilter.vue';
import TableAutocompleteFilter from './TableAutocompleteFilter.vue';
import { useTableFilterPresets } from '@/composables/useTableFilterPresets';

const emit = defineEmits(['apply', 'update:modelValue']);

const props = defineProps({
    modelValue: {
        type: [String, Number, Boolean, null],
        default: null
    },
    config: {
        type: Object,
        required: true
    }
});

const { presets } = useTableFilterPresets();

const onApply = () => {
    emit('apply');
};

const onUpdate = (value) => {
    emit('update:modelValue', value);
};

const autocompletePreset = computed(() => {
    if (!props.config?.preset) {
        return null;
    }

    return presets[props.config.preset] ?? null;
});

const autocompleteSuggestions = computed(() => {
    const suggestions =
        autocompletePreset.value?.suggestions ?? props.config.suggestions ?? [];

    return [...unref(suggestions)];
});

const autocompleteLoading = computed(() => {
    const loading =
        autocompletePreset.value?.loading ?? props.config.loading ?? false;

    return !!unref(loading);
});
</script>

<template>
    <TableTextFilter
        v-if="config.type === 'text' || config.type === 'number'"
        :modelValue="modelValue"
        :placeholder="config.placeholder"
        @update:modelValue="onUpdate"
        @apply="onApply"
    />
    <TableSelectFilter
        v-else-if="config.type === 'select' || config.type === 'boolean'"
        :modelValue="modelValue"
        :options="config.options"
        :placeholder="config.placeholder"
        @update:modelValue="onUpdate"
        @apply="onApply"
    />
    <TableAutocompleteFilter
        v-else-if="config.type === 'autocomplete'"
        :modelValue="modelValue"
        :placeholder="config.placeholder"
        :suggestions="autocompleteSuggestions"
        :loading="autocompleteLoading"
        :onComplete="autocompletePreset?.onComplete ?? config.onComplete"
        @update:modelValue="onUpdate"
        @apply="onApply"
    />
</template>
