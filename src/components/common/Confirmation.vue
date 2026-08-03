<script setup>
import { computed, getCurrentInstance } from 'vue';

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    header: { type: String, default: '' },
    content: { type: String, default: '' },
    variant: { type: String, default: 'info' }, // info, warning, danger, success
    confirmButtonText: { type: String, default: '' },
    cancelButtonText: { type: String, default: '' },
    showAlertIcon: { type: Boolean, default: true },
    /** When true, confirm action is in progress (blocks dismiss / shows spinner). */
    loading: { type: Boolean, default: false },
    /** When false, the dialog stays open after Confirm until the parent closes v-model. */
    closeOnConfirm: { type: Boolean, default: true },
    /** When true, line breaks in content are preserved. */
    preserveLineBreaks: { type: Boolean, default: false }
});

const emit = defineEmits(['confirm', 'update:modelValue', 'cancel']);

const resolvedHeader = computed(
    () => props.header || $t('common.confirmation.header')
);
const resolvedContent = computed(
    () => props.content || $t('common.confirmation.content')
);
const resolvedConfirmButtonText = computed(
    () => props.confirmButtonText || $t('common.actions.confirm')
);
const resolvedCancelButtonText = computed(
    () => props.cancelButtonText || $t('common.actions.cancel')
);

const dialog = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
});

const currentVariant = computed(() => {
    switch (props.variant) {
        case 'warning':
            return { severity: 'warn', icon: 'pi pi-exclamation-triangle' };
        case 'danger':
            return { severity: 'danger', icon: 'pi pi-exclamation-triangle' };
        case 'success':
            return { severity: 'success', icon: 'pi pi-check-circle' };
        default:
            return { severity: 'info', icon: 'pi pi-info-circle' };
    }
});

const confirm = () => {
    if (props.loading) return;
    emit('confirm');
    if (props.closeOnConfirm) {
        dialog.value = false;
    }
};

const cancel = () => {
    if (props.loading) return;
    emit('cancel');
    dialog.value = false;
};
</script>

<template>
    <Dialog
        v-model:visible="dialog"
        modal
        class="w-full sm:w-2/3 md:w-1/2 lg:w-1/3"
        :closable="false"
        :dismissable-mask="false"
        :close-on-escape="!loading"
    >
        <template #header>
            <div class="flex items-center justify-between w-full">
                <h3 class="text-lg font-semibold">{{ resolvedHeader }}</h3>
                <Button
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    rounded
                    :disabled="loading"
                    @click="cancel"
                />
            </div>
        </template>

        <div class="flex items-start gap-4 pb-5">
            <i
                v-if="showAlertIcon"
                :class="`${currentVariant.icon} shrink-0 mt-0.5 !text-3xl`"
            ></i>
            <div class="min-w-0 flex-1">
                <slot name="content">
                    <p
                        class="text-gray-700 dark:text-gray-200 mb-0"
                        :class="{ 'whitespace-pre-line': preserveLineBreaks }"
                    >
                        {{ resolvedContent }}
                    </p>
                </slot>
            </div>
        </div>

        <template #footer>
            <Button
                text
                variant="outlined"
                :label="resolvedCancelButtonText"
                :disabled="loading"
                @click="cancel"
                class="mr-2"
            />
            <Button
                :label="resolvedConfirmButtonText"
                :loading="loading"
                :disabled="loading"
                @click="confirm"
                :severity="currentVariant.severity"
            />
        </template>
    </Dialog>
</template>
