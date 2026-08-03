<script setup>
import { ref, watch, nextTick, toRef, computed, getCurrentInstance } from 'vue';
import { useFormDirty } from '@/composables/useFormDirty';

const props = defineProps({
    visible: { type: Boolean, default: false },
    header: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    cancelLabel: { type: String, default: '' },
    confirmLabel: { type: String, default: '' },
    isEditMode: { type: Boolean, default: false },
    formData: { type: Object, required: true },
    enableDirtyCheck: { type: Boolean, default: true },
    initialData: { type: Object, default: null },
    hideFooter: { type: Boolean, default: false },
    disableConfirm: { type: Boolean, default: false },
    /** formData keys to ignore when computing dirty state */
    excludeDirtyKeys: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:visible', 'cancel', 'confirm']);

const { isDirty, resetDirty } = useFormDirty(
    toRef(props, 'formData'),
    toRef(props, 'initialData'),
    { excludeKeys: props.excludeDirtyKeys }
);

const showUnsavedDialog = ref(false);
let pendingClose = false;

const resolvedHeader = computed(
    () => props.header || $t('common.actions.edit') || $t('common.actions.new')
);
const resolvedCancelLabel = computed(
    () => props.cancelLabel || $t('common.actions.cancel')
);
const resolvedConfirmLabel = computed(
    () => props.confirmLabel || $t('common.actions.save')
);
const resolvedUnsavedTitle = computed(() =>
    $t('common.dialog.unsavedChangesTitle')
);
const resolvedUnsavedContent = computed(() =>
    $t('common.dialog.unsavedChangesContent')
);

// Reset dirty state on open
watch(
    () => props.visible,
    (isVisible, wasVisible) => {
        if (isVisible && !wasVisible) {
            nextTick(() => {
                if (props.isEditMode && props.initialData) {
                    resetDirty(props.initialData);
                } else {
                    resetDirty();
                }
            });
        }
    }
);

function handleVisibilityChange(visible) {
    if (!visible && !pendingClose) {
        handleCancel();
    } else {
        emit('update:visible', visible);
    }
}

// Cancel button or close attempt
function handleCancel() {
    if (props.enableDirtyCheck && isDirty.value) {
        showUnsavedDialog.value = true;
    } else {
        executeClose();
    }
}

function handleConfirm() {
    emit('confirm');
}

// Force close dialog
function executeClose() {
    pendingClose = true;
    emit('cancel');
    emit('update:visible', false);
    nextTick(() => {
        pendingClose = false;
    });
}

// User confirmed discarding changes
function confirmDiscard() {
    showUnsavedDialog.value = false;
    executeClose();
}

// Expose dirtiness API for parent access
defineExpose({
    isDirty,
    resetDirty,
    handleCancel
});
</script>

<template>
    <Dialog
        :header="resolvedHeader"
        :visible="visible"
        @update:visible="handleVisibilityChange"
        :modal="true"
        v-bind="$attrs"
        class="w-full sm:w-2/3 md:w-1/2 lg:w-1/3"
    >
        <form @submit.prevent="handleConfirm">
            <div class="grid grid-cols-12 gap-4">
                <slot />
            </div>
        </form>

        <template #footer v-if="!props.hideFooter">
            <slot name="footer">
                <Button
                    text
                    variant="outlined"
                    :label="resolvedCancelLabel"
                    @click="handleCancel"
                    :disabled="busy"
                    class="mr-2"
                    type="button"
                />
                <Button
                    icon="pi pi-check"
                    iconPos="left"
                    :loading="busy"
                    :disabled="
                        (props.enableDirtyCheck && !isDirty) ||
                        busy ||
                        props.disableConfirm
                    "
                    :label="resolvedConfirmLabel"
                    @click="handleConfirm"
                />
            </slot>
        </template>
    </Dialog>

    <Confirmation
        v-model="showUnsavedDialog"
        :header="resolvedUnsavedTitle"
        :content="resolvedUnsavedContent"
        variant="danger"
        :confirmButtonText="$t('common.dialog.discardChanges')"
        :cancelButtonText="$t('common.dialog.keepEditing')"
        @confirm="confirmDiscard"
    />
</template>
