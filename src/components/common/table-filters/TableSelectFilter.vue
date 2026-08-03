<script setup>
const emit = defineEmits(['apply', 'update:modelValue']);

defineProps({
    modelValue: {
        type: [String, Number, Boolean, null],
        default: null
    },
    options: {
        type: Array,
        default: () => []
    },
    placeholder: {
        type: String,
        default: ''
    },
    showClear: {
        type: Boolean,
        default: true
    }
});

const onChange = (value) => {
    emit('update:modelValue', value);
    emit('apply');
};
</script>

<template>
    <Select
        :modelValue="modelValue"
        :options="options"
        optionLabel="label"
        optionValue="value"
        :placeholder="placeholder || $t('select')"
        class="w-full"
        inputClass="w-full"
        :showClear="showClear"
        @update:modelValue="onChange"
    />
</template>
