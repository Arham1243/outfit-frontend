<script setup>
import { ref } from 'vue';

const emit = defineEmits(['apply', 'update:modelValue']);

const props = defineProps({
    modelValue: {
        type: [String, Number, null],
        default: null
    },
    suggestions: {
        type: Array,
        default: () => []
    },
    placeholder: {
        type: String,
        default: ''
    },
    onComplete: {
        type: Function,
        default: null
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const localSuggestions = ref([]);

const handleComplete = (event) => {
    if (props.onComplete) {
        props.onComplete(event);
        return;
    }

    localSuggestions.value = [...props.suggestions];
};

const onInput = (value) => {
    emit('update:modelValue', value);

    if (value === null || value === '') {
        emit('apply');
    }
};

const onOptionSelect = (event) => {
    emit('update:modelValue', event.value);
    emit('apply');
};

const onEnter = () => {
    emit('apply');
};
</script>

<template>
    <AutoComplete
        :modelValue="modelValue"
        :suggestions="onComplete ? [...suggestions] : localSuggestions"
        :loading="loading"
        :forceSelection="false"
        class="w-full"
        inputClass="w-full"
        :placeholder="placeholder"
        @complete="handleComplete"
        @update:modelValue="onInput"
        @option-select="onOptionSelect"
        @keydown.enter="onEnter"
    />
</template>
