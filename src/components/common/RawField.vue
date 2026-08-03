<script setup>
/* global $t */
import DateField from './DateField.vue';
import { truncate } from 'lodash-es';
import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

defineProps({
    variant: {
        type: String,
        required: true
    },
    invalid: {
        type: Boolean,
        default: false
    },
    errorMessages: {
        type: [String, Array]
    }
});

const attrs = useAttrs();

/** Map `id` to PrimeVue `inputId` so `<label for="...">` toggles the native input, not the wrapper. */
const labeledInputAttrs = computed(() => {
    const { id, inputId, ...rest } = attrs;
    return {
        ...rest,
        inputId: inputId || id
    };
});

const dropdownAttrs = computed(() => {
    const { loading, disabled, placeholder, ...rest } = attrs;
    const isLoading = Boolean(loading);

    return {
        ...rest,
        loading: isLoading,
        placeholder: placeholder ?? $t('select'),
        disabled: Boolean(disabled) || isLoading
    };
});
</script>
<template>
    <InputText
        v-if="variant == 'text'"
        v-bind="$attrs"
        :invalid="invalid"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue'](
                $event.target.value === '' ? null : $event.target.value
            )
        "
    />
    <Textarea
        v-else-if="variant == 'textarea'"
        v-bind="$attrs"
        :invalid="invalid"
        spellcheck="true"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue'](
                $event.target.value === '' ? null : $event.target.value
            )
        "
    />
    <AutoComplete
        v-else-if="variant == 'autocomplete'"
        v-bind="$attrs"
        :invalid="invalid"
    />
    <Chips v-else-if="variant == 'chips'" v-bind="$attrs" />
    <Checkbox v-else-if="variant == 'checkbox'" v-bind="labeledInputAttrs" />
    <RadioButton v-else-if="variant == 'radio'" v-bind="labeledInputAttrs" />
    <InputNumber
        v-else-if="variant == 'number'"
        v-bind="$attrs"
        :invalid="invalid"
        :minFractionDigits="$attrs.minFractionDigits ?? 0"
        :maxFractionDigits="$attrs.maxFractionDigits ?? 2"
        :max="$attrs.max ?? 999999999999999"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue']($event.value)
        "
        @keydown="
            (event) => {
                const input = event.target;
                const currentValue = input.value;
                const key = event.key;

                // If user types a decimal point as the first character or after clearing
                if (
                    key === '.' &&
                    (!currentValue ||
                        currentValue === '' ||
                        currentValue === '-')
                ) {
                    event.preventDefault();
                    const newValue = currentValue === '-' ? '-0.' : '0.';
                    input.value = newValue;
                    // Trigger input event to update the model
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        "
    />
    <Password
        v-else-if="variant == 'password'"
        v-bind="$attrs"
        :invalid="invalid"
    />
    <MultiSelect
        v-else-if="variant == 'multiselect'"
        v-bind="$attrs"
        :invalid="invalid"
    />
    <Select
        v-else-if="variant == 'dropdown'"
        v-bind="dropdownAttrs"
        :invalid="invalid"
    >
        <template #option="{ option }" v-if="$attrs.tooltip">
            <div
                v-if="
                    option.value
                        ? option.value.length > ($attrs.tooltipLength ?? 20)
                        : option.name.length > ($attrs.tooltipLength ?? 20)
                "
                v-tooltip.top="option.value ?? option.name"
            >
                {{
                    truncate(option.name, {
                        length: $attrs.tooltipLength ?? 20
                    })
                }}
            </div>
        </template>
    </Select>
    <SelectButton v-else-if="variant == 'selectButton'" v-bind="$attrs" />
    <ToggleSwitch v-else-if="variant == 'switch'" v-bind="$attrs" />
    <InputText
        v-else-if="variant == 'phone'"
        v-bind="$attrs"
        :invalid="invalid"
        @input="
            $attrs['onUpdate:modelValue'] &&
            $attrs['onUpdate:modelValue'](
                $event.target.value === '' ? null : $event.target.value
            )
        "
    />
    <DateField
        v-else-if="variant == 'date'"
        v-bind="$attrs"
        :class="{ 'date-field--invalid': invalid }"
    />
</template>

<style lang="scss" scoped></style>
