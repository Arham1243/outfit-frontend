<script setup>
const emit = defineEmits(['apply', 'update:modelValue']);

const props = defineProps({
    modelValue: {
        type: [String, Number],
        default: null
    },
    placeholder: {
        type: String,
        default: ''
    }
});

const onInput = (value) => {
    emit('update:modelValue', value);
    emit('apply');
};
</script>

<template>
    <InputText
        :modelValue="modelValue"
        type="text"
        class="w-full"
        inputClass="w-full"
        :placeholder="placeholder"
        @update:modelValue="onInput"
        @keydown.enter="emit('apply')"
    />
</template>
