<script setup>
import { computed, ref, watch } from 'vue';
import { buildWardrobeTypeOptions } from '@/config';
import { useHelpers } from '@/composables';
import { useWardrobeUpload } from './useWardrobeUpload';
import {
    formatType,
    getItemDisplayName,
    getItemImageUrl
} from './wardrobeDisplay';

const props = defineProps({
    visible: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    item: { type: Object, default: null }
});

const emit = defineEmits(['update:visible', 'save']);

const { filterFileFields } = useHelpers();
const wardrobeTypeOptions = computed(() => buildWardrobeTypeOptions($t));

const formData = ref({
    name: '',
    type: null,
    image: null
});

const initialData = ref(null);

const {
    isDragOver,
    fileInputRef,
    isAcceptedImage,
    readFileAsDataUrl,
    openFilePicker,
    resetFileInput,
    onDragOver,
    onDragLeave
} = useWardrobeUpload();

watch(
    () => props.visible,
    (visible) => {
        if (visible && props.item) {
            const image = getItemImageUrl(props.item);
            formData.value = {
                name: props.item.name ?? '',
                type: props.item.type ?? null,
                image
            };
            initialData.value = {
                name: props.item.name ?? '',
                type: props.item.type ?? null,
                image
            };
        }

        if (!visible) {
            formData.value = { name: '', type: null, image: null };
            initialData.value = null;
            resetFileInput();
            isDragOver.value = false;
        }
    }
);

const subtitle = computed(() =>
    props.item ? getItemDisplayName(props.item, $t('wardrobe_untitled')) : ''
);

async function processFiles(fileList) {
    const files = Array.from(fileList || []).filter(isAcceptedImage);
    if (!files.length) return;
    formData.value.image = await readFileAsDataUrl(files[0]);
}

async function onFileInputChange(event) {
    await processFiles(event.target.files);
    resetFileInput();
}

async function onDrop(event) {
    event.preventDefault();
    isDragOver.value = false;
    await processFiles(event.dataTransfer?.files);
}

function closeDialog() {
    emit('update:visible', false);
}

function save() {
    const payload = {};
    const trimmedName = formData.value.name?.trim() ?? '';

    if (trimmedName !== (initialData.value?.name ?? '')) {
        payload.name = trimmedName;
    }

    if (formData.value.type !== (initialData.value?.type ?? null)) {
        payload.type = formData.value.type;
    }

    const imagePayload = filterFileFields({ image: formData.value.image }, ['image']);
    if (imagePayload.image && imagePayload.image !== initialData.value?.image) {
        payload.image = imagePayload.image;
    }

    if (!Object.keys(payload).length) {
        closeDialog();
        return;
    }

    emit('save', payload);
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="wardrobe-dialog wardrobe-dialog--edit"
        :draggable="false"
        :style="{ width: 'min(94vw, 32rem)' }"
        @update:visible="emit('update:visible', $event)"
    >
        <template #header>
            <div class="wardrobe-dialog__header-stack">
                <span class="wardrobe-dialog__header-title">
                    {{ $t('wardrobe_edit_dialog_title') }}
                </span>
                <span class="wardrobe-dialog__header-subtitle">{{ subtitle }}</span>
            </div>
        </template>

        <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            :disabled="busy"
            @change="onFileInputChange"
        />

        <div
            v-if="formData.image"
            class="wardrobe-dialog__preview wardrobe-dialog__preview--edit"
            @click="openFilePicker(busy)"
        >
            <img :src="formData.image" alt="" class="wardrobe-dialog__preview-img" />
        </div>

        <div class="wardrobe-dialog__field">
            <label class="wardrobe-dialog__label" for="wardrobe-edit-name">
                {{ $t('wardrobe_item_name') }}
            </label>
            <InputText
                id="wardrobe-edit-name"
                v-model="formData.name"
                :placeholder="$t('wardrobe_item_name_placeholder')"
                class="w-full"
                :disabled="busy"
            />
        </div>

        <div class="wardrobe-dialog__field">
            <label class="wardrobe-dialog__label" for="wardrobe-edit-type">
                {{ $t('wardrobe_type') }}
            </label>
            <Select
                id="wardrobe-edit-type"
                v-model="formData.type"
                :options="wardrobeTypeOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('classification_pending')"
                showClear
                class="w-full"
                :disabled="busy"
            />
        </div>

        <template #footer>
            <Button
                type="button"
                :label="$t('cancel')"
                text
                :disabled="busy"
                @click="closeDialog"
            />
            <Button
                type="button"
                :label="$t('wardrobe_save_changes')"
                icon="pi pi-check"
                :loading="busy"
                :disabled="busy"
                @click="save"
            />
        </template>
    </Dialog>
</template>
