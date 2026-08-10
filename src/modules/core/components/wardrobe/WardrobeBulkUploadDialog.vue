<script setup>
import { ref, watch } from 'vue';
import { useWardrobeUpload } from './useWardrobeUpload';
import WardrobeUploadDropzone from './WardrobeUploadDropzone.vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'save']);

const pendingImages = ref([]);

const {
    isDragOver,
    fileInputRef,
    isAcceptedImage,
    createPendingImage,
    openFilePicker,
    resetFileInput,
    onDragOver,
    onDragLeave,
    formatFileSize
} = useWardrobeUpload();

watch(
    () => props.visible,
    (visible) => {
        if (!visible) {
            pendingImages.value = [];
            resetFileInput();
            isDragOver.value = false;
        }
    }
);

async function processFiles(fileList) {
    const files = Array.from(fileList || []).filter(isAcceptedImage);
    if (!files.length) return;
    const results = await Promise.all(
        files.map((file) => createPendingImage(file))
    );
    pendingImages.value = [...pendingImages.value, ...results];
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

function removePendingImage(index) {
    pendingImages.value.splice(index, 1);
}

function closeDialog() {
    emit('update:visible', false);
}

function save() {
    if (!pendingImages.value.length) return;
    emit(
        'save',
        pendingImages.value.map((item) => item.preview)
    );
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="wardrobe-dialog wardrobe-dialog--bulk"
        :header="$t('wardrobe_bulk_upload')"
        :draggable="false"
        :style="{ width: 'min(94vw, 36rem)' }"
        @update:visible="emit('update:visible', $event)"
    >
        <p class="wardrobe-dialog__description">
            {{ $t('wardrobe_bulk_upload_description') }}
        </p>

        <input
            ref="fileInputRef"
            type="file"
            class="hidden"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            multiple
            :disabled="busy"
            @change="onFileInputChange"
        />

        <WardrobeUploadDropzone
            :busy="busy"
            :is-drag-over="isDragOver"
            variant="bulk"
            icon="pi pi-box"
            :title="$t('wardrobe_bulk_drop_title')"
            :compact="pendingImages.length > 0"
            @pick="openFilePicker(busy)"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
        />

        <div v-if="pendingImages.length" class="wardrobe-upload__preview-list">
            <div
                v-for="(item, index) in pendingImages"
                :key="item.id"
                class="wardrobe-upload__file-card"
            >
                <div class="wardrobe-upload__file-card-main">
                    <span
                        class="wardrobe-upload__file-thumb"
                        aria-hidden="true"
                    >
                        <img
                            :src="item.preview"
                            :alt="item.name"
                            class="wardrobe-upload__file-thumb-img"
                        />
                    </span>
                    <div class="wardrobe-upload__file-details">
                        <p
                            class="wardrobe-upload__file-name"
                            :title="item.name"
                        >
                            {{ item.name }}
                        </p>
                        <p
                            v-if="formatFileSize(item.size)"
                            class="wardrobe-upload__file-meta"
                        >
                            {{ formatFileSize(item.size) }}
                        </p>
                    </div>
                </div>

                <Button
                    size="small"
                    type="button"
                    severity="danger"
                    rounded
                    icon="pi pi-trash"
                    :aria-label="$t('remove_image')"
                    :disabled="busy"
                    @click.stop="removePendingImage(index)"
                />
            </div>
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
                :label="$t('wardrobe_bulk_upload')"
                icon="pi pi-upload"
                :loading="busy"
                :disabled="!pendingImages.length || busy"
                @click="save"
            />
        </template>
    </Dialog>
</template>
