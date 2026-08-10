<script setup>
import { computed, ref, watch } from 'vue';
import { buildWardrobeTypeOptions } from '@/config';
import { useGlobalStore } from '@/stores';
import { useWardrobeUpload } from './useWardrobeUpload';
import WardrobeUploadDropzone from './WardrobeUploadDropzone.vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'save']);

const globalStore = useGlobalStore();
const wardrobeTypeOptions = computed(() => buildWardrobeTypeOptions($t));

const formData = ref({
    name: '',
    type: null,
    image: null
});

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
        if (!visible) {
            formData.value = { name: '', type: null, image: null };
            resetFileInput();
            isDragOver.value = false;
        }
    }
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
    if (!formData.value.image) {
        globalStore.showError(
            $t('validation_error'),
            $t('please_select_an_image')
        );
        return;
    }

    if (!formData.value.name?.trim()) {
        globalStore.showError(
            $t('validation_error'),
            $t('wardrobe_item_name_required')
        );
        return;
    }

    emit('save', {
        name: formData.value.name.trim(),
        type: formData.value.type,
        image: formData.value.image
    });
}

const canSave = computed(() =>
    Boolean(formData.value.image && formData.value.name?.trim())
);
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="wardrobe-dialog wardrobe-dialog--add"
        :header="$t('wardrobe_add_dialog_title')"
        :draggable="false"
        :style="{ width: 'min(94vw, 32rem)' }"
        @update:visible="emit('update:visible', $event)"
    >
        <p class="wardrobe-dialog__description">
            {{ $t('wardrobe_add_dialog_description') }}
        </p>

        <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            :disabled="busy"
            @change="onFileInputChange"
        />

        <div v-if="formData.image" class="wardrobe-dialog__preview">
            <img
                :src="formData.image"
                alt=""
                class="wardrobe-dialog__preview-img"
            />
        </div>

        <WardrobeUploadDropzone
            v-else
            :busy="busy"
            :is-drag-over="isDragOver"
            :title="$t('wardrobe_drop_image_here')"
            @pick="openFilePicker(busy)"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
        />

        <div class="wardrobe-dialog__field">
            <label class="wardrobe-dialog__label" for="wardrobe-add-name">
                {{ $t('wardrobe_item_name') }}
            </label>
            <InputText
                id="wardrobe-add-name"
                v-model="formData.name"
                :placeholder="$t('wardrobe_item_name_placeholder')"
                class="w-full"
                :disabled="busy"
            />
        </div>

        <div class="wardrobe-dialog__field">
            <label class="wardrobe-dialog__label" for="wardrobe-add-type">
                {{ $t('wardrobe_type') }}
            </label>
            <Select
                id="wardrobe-add-type"
                v-model="formData.type"
                :options="wardrobeTypeOptions"
                optionLabel="label"
                optionValue="value"
                :placeholder="$t('select')"
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
                :label="$t('wardrobe_add_item')"
                icon="pi pi-check"
                :loading="busy"
                :disabled="!canSave || busy"
                @click="save"
            />
        </template>
    </Dialog>
</template>
