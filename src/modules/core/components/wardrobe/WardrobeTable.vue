<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useWardrobeStore } from '@/modules/core/stores';
import { WardrobeService } from '@/modules/core/services';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions, WARDROBE_IMAGE } from '@/config';
import { useHelpers } from '@/composables';
import { getValidationErrorMessage } from '@/utils/apiErrors';

const ACCEPTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
];
const MAX_FILE_SIZE = WARDROBE_IMAGE.maxFileSizeMb * 1024 * 1024;
const CLASSIFICATION_POLL_INTERVAL_MS = 3000;
const CLASSIFICATION_POLL_MAX_MS = 120000;

const uploadDimensionHint = computed(() =>
    $t('wardrobe_upload_recommended_dimensions', {
        width: WARDROBE_IMAGE.recommendedWidth,
        height: WARDROBE_IMAGE.recommendedHeight,
        ratio: WARDROBE_IMAGE.aspectRatioLabel
    })
);

const helpers = useHelpers();
const { filterFileFields } = helpers;

const wardrobeStore = useWardrobeStore();
const globalStore = useGlobalStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const menu = ref();
const selectedItem = ref(null);
const selectedItems = ref([]);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const isBulkDelete = ref(false);
const isDragOver = ref(false);
const fileInputRef = ref(null);
const formData = ref({
    image: null
});
/** Pending uploads for multi-create */
const pendingImages = ref([]);
let classificationPollTimer = null;
let classificationPollStartedAt = null;

const hasItemsPendingClassification = computed(() =>
    items.value.some((item) => !item.type)
);

const dialogHeader = computed(() =>
    isEditMode.value ? $t('edit_wardrobe_image') : $t('add_new_item')
);
const dialogFormData = computed(() =>
    isEditMode.value
        ? formData.value
        : { images: pendingImages.value.map((item) => item.preview) }
);
const dialogInitialData = computed(() =>
    isEditMode.value
        ? {
              image:
                  selectedItem.value?.image_url ||
                  selectedItem.value?.image ||
                  null
          }
        : null
);

onBeforeMount(async () => {
    await getItems();
});

onBeforeUnmount(() => {
    stopClassificationPolling();
});

const stopClassificationPolling = () => {
    if (classificationPollTimer) {
        clearInterval(classificationPollTimer);
        classificationPollTimer = null;
    }
    classificationPollStartedAt = null;
};

const refreshItemsSilently = async () => {
    const params = { ...pagination.getPageParams() };
    const payload = sortFilters.getSortFilters();
    const res = await WardrobeService.search(payload, params);
    items.value = res.data.data;
    totalRecords.value = res.data.meta.total;
};

const pollClassificationUpdates = async () => {
    if (!hasItemsPendingClassification.value) {
        stopClassificationPolling();
        return;
    }

    if (
        classificationPollStartedAt &&
        Date.now() - classificationPollStartedAt > CLASSIFICATION_POLL_MAX_MS
    ) {
        stopClassificationPolling();
        return;
    }

    try {
        await refreshItemsSilently();
    } catch {
        // Ignore transient poll failures; next interval will retry.
    }

    if (!hasItemsPendingClassification.value) {
        stopClassificationPolling();
    }
};

const startClassificationPolling = () => {
    if (classificationPollTimer || !hasItemsPendingClassification.value) {
        return;
    }

    classificationPollStartedAt = Date.now();
    pollClassificationUpdates();
    classificationPollTimer = setInterval(
        pollClassificationUpdates,
        CLASSIFICATION_POLL_INTERVAL_MS
    );
};

watch(hasItemsPendingClassification, (pending) => {
    if (pending) {
        startClassificationPolling();
    } else {
        stopClassificationPolling();
    }
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: $t('edit'),
            icon: 'pi pi-pencil',
            command: () => editItem(),
            permission: 'core.wardrobe.edit'
        },
        {
            label: $t('delete'),
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'core.wardrobe.delete'
        }
    ].filter(Boolean);

    return helpers.filterByPermission(allMenuItems);
});

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onDialogVisible = (visible) => {
    if (!visible) {
        resetForm();
    }
};

const resetForm = () => {
    formData.value.image = null;
    pendingImages.value = [];
    isDragOver.value = false;
    globalStore.clearErrors();
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
};

const editItem = () => {
    resetForm();
    formData.value.image =
        selectedItem.value.image_url || selectedItem.value.image || null;
    openDialog('edit');
};

const showDeleteDialog = () => {
    isBulkDelete.value = false;
    deleteDialog.value = true;
};

const showBulkDeleteDialog = () => {
    if (!selectedItems.value.length) return;
    isBulkDelete.value = true;
    deleteDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    selectedItems.value = [];
    getItems();
};

const deleteDialogHeader = computed(() =>
    isBulkDelete.value
        ? $t('delete_wardrobe_images')
        : $t('delete_wardrobe_image')
);

const deleteDialogContent = computed(() =>
    isBulkDelete.value
        ? $t('are_you_sure_you_want_to_delete_selected_wardrobe_images', {
              count: selectedItems.value.length
          })
        : $t('are_you_sure_you_want_to_delete_this_wardrobe_image')
);

const getItems = async () => {
    try {
        loading.value = true;
        const params = { ...pagination.getPageParams() };
        const payload = sortFilters.getSortFilters();
        const res = await wardrobeStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const formatFileSize = (bytes) => {
    if (!bytes) return '';

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const createPendingImage = async (file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    preview: await readFileAsDataUrl(file)
});

const isAcceptedImage = (file) => {
    if (!file) return false;
    if (file.size > MAX_FILE_SIZE) return false;
    if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
    const name = String(file.name ?? '').toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) =>
        name.endsWith(ext)
    );
};

const openFilePicker = () => {
    if (busy.value) return;
    fileInputRef.value?.click();
};

const processFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(isAcceptedImage);
    if (!files.length) return;

    if (isEditMode.value) {
        formData.value.image = await readFileAsDataUrl(files[0]);
        return;
    }

    const results = await Promise.all(files.map((file) => createPendingImage(file)));
    pendingImages.value = [...pendingImages.value, ...results];
};

const onFileInputChange = async (event) => {
    await processFiles(event.target.files);
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
};

const onDragOver = (event) => {
    event.preventDefault();
    isDragOver.value = true;
};

const onDragLeave = (event) => {
    event.preventDefault();
    isDragOver.value = false;
};

const onDrop = async (event) => {
    event.preventDefault();
    isDragOver.value = false;
    await processFiles(event.dataTransfer?.files);
};

const removePendingImage = (index) => {
    pendingImages.value.splice(index, 1);
};

const clearEditImage = () => {
    formData.value.image = null;
    if (fileInputRef.value) {
        fileInputRef.value.value = '';
    }
};

const showAddDropzone = computed(
    () => !isEditMode.value || !formData.value.image
);

const formatType = (type) => {
    if (!type) return null;
    return String(type)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
};

const formatConfidence = (confidence) => {
    if (confidence === null || confidence === undefined) return null;
    return `${Math.round(Number(confidence) * 100)}%`;
};

const getPredictedLabels = (metadata) => {
    if (!metadata?.predicted_labels?.length) return [];
    return metadata.predicted_labels;
};

const getTypeTagClass = (type) => {
    const normalizedType = String(type || '').toLowerCase();
    const typeClasses = {
        't-shirt': 'wardrobe-type--t-shirt',
        shirt: 'wardrobe-type--shirt',
        pants: 'wardrobe-type--pants',
        jeans: 'wardrobe-type--jeans',
        shoes: 'wardrobe-type--shoes',
        jacket: 'wardrobe-type--jacket',
        sweater: 'wardrobe-type--sweater',
        shorts: 'wardrobe-type--shorts',
        dress: 'wardrobe-type--dress'
    };

    return typeClasses[normalizedType] ?? 'wardrobe-type--default';
};

const save = async () => {
    try {
        busy.value = true;

        if (isEditMode.value) {
            const payload = filterFileFields({ ...formData.value }, ['image']);
            if (payload.image) {
                await wardrobeStore.update(selectedItem.value.uuid, payload);
            }
        } else {
            if (!pendingImages.value.length) {
                globalStore.showError(
                    $t('validation_error'),
                    $t('please_select_an_image')
                );
                return;
            }
            const silent = pendingImages.value.length > 1;
            for (const item of pendingImages.value) {
                await wardrobeStore.create({ image: item.preview }, { silent });
            }
            if (silent) {
                globalStore.showSuccess(
                    $t('wardrobe_created'),
                    $t('wardrobe_images_uploaded_successfully', {
                        count: pendingImages.value.length
                    })
                );
            }
        }

        closeDialog();
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const deleteItem = async () => {
    try {
        loading.value = true;
        if (isBulkDelete.value) {
            const uuids = selectedItems.value.map((item) => item.uuid);
            if (uuids.length) {
                await wardrobeStore.bulkDelete(uuids);
            }
            selectedItems.value = [];
        } else if (selectedItem.value) {
            await wardrobeStore.deleteItem(selectedItem.value.uuid);
            selectedItems.value = selectedItems.value.filter(
                (item) => item.uuid !== selectedItem.value.uuid
            );
        }
        deleteDialog.value = false;
        isBulkDelete.value = false;
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        deleteDialog.value = false;
        isBulkDelete.value = false;
        globalStore.showError(
            $t('cannot_delete'),
            getValidationErrorMessage(error, $t('something_went_wrong'))
        );
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <h1 class="text-2xl sm:text-3xl font-bold">
                {{ $t('wardrobe') }}
            </h1>
        </template>
        <template #actions>
            <Button
                v-if="
                    $ability.can('core.wardrobe.delete') &&
                    selectedItems.length
                "
                :label="$t('delete')"
                icon="pi pi-trash"
                severity="danger"
                @click="showBulkDeleteDialog"
            />
            <Button
                v-if="$ability.can('core.wardrobe.create')"
                :label="$t('add_new_item')"
                icon="pi pi-plus"
                @click="openDialog('add')"
            />
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                v-model:selection="selectedItems"
                selectionMode="multiple"
                dataKey="uuid"
                :reorderableColumns="true"
                :value="items"
                :page="pagination.page"
                :rows="pagination.limit"
                :total-records="totalRecords"
                :loading="loading"
                @page="onPageChange"
            >
                <template #empty>{{ $t('no_wardrobe_images_found') }}</template>

                <Column
                    v-if="$ability.can('core.wardrobe.delete')"
                    columnKey="selection"
                    selectionMode="multiple"
                    style="width: 3rem"
                />

                <Column
                    columnKey="image"
                    field="image"
                    :header="$t('image')"
                >
                    <template #body="{ data }">
                        <div class="wardrobe-table__thumb">
                            <Image
                                v-if="data.image_url || data.image"
                                :src="data.image_url || data.image"
                                alt="Wardrobe"
                                preview
                                imageClass="wardrobe-table__thumb-img"
                            />
                            <span v-else>-</span>
                        </div>
                    </template>
                </Column>

                <Column
                    columnKey="type"
                    field="type"
                    :header="$t('wardrobe_type')"
                >
                    <template #body="{ data }">
                        <Tag
                            v-if="data.type"
                            :value="formatType(data.type)"
                            :class="getTypeTagClass(data.type)"
                            class="wardrobe-type-tag"
                            rounded
                        />
                        <span v-else class="wardrobe-table__pending">
                            {{ $t('classification_pending') }}
                        </span>
                    </template>
                </Column>

                <Column
                    columnKey="predicted_labels"
                    field="metadata.predicted_labels"
                    :header="$t('predicted_labels')"
                >
                    <template #body="{ data }">
                        <div
                            v-if="getPredictedLabels(data.metadata).length"
                            class="wardrobe-table__labels"
                        >
                            <span
                                v-for="(prediction, index) in getPredictedLabels(
                                    data.metadata
                                )"
                                :key="`${prediction.label}-${index}`"
                                class="wardrobe-table__label-chip"
                            >
                                {{ formatType(prediction.label) }}
                                ({{
                                    formatConfidence(prediction.score)
                                }})
                            </span>
                        </div>
                        <span v-else>-</span>
                    </template>
                </Column>

                <Column
                    columnKey="actions"
                    v-if="
                        $ability.can('core.wardrobe.edit') ||
                        $ability.can('core.wardrobe.delete')
                    "
                    :header="$t('actions')"
                    style="width: 8rem"
                    class="text-right"
                >
                    <template #body="{ data }">
                        <Button
                            class="!px-3 !py-2"
                            :label="$t('actions')"
                            variant="outlined"
                            iconPos="right"
                            icon="pi pi-chevron-down"
                            size="small"
                            @click="showActions($event, data)"
                        />

                        <Menu
                            ref="menu"
                            id="overlay_menu"
                            :model="menuItems"
                            :popup="true"
                        />
                    </template>
                </Column>
            </BaseTable>
        </template>
    </Card>

    <BaseDialog
        v-if="
            $ability.can('core.wardrobe.edit') ||
            $ability.can('core.wardrobe.create')
        "
        v-model:visible="showDialog"
        @update:visible="onDialogVisible"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="dialogHeader"
        :confirmLabel="isEditMode ? $t('update') : $t('save')"
        :formData="dialogFormData"
        :initialData="dialogInitialData"
        :enableDirtyCheck="true"
        class="wardrobe-upload-dialog"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12 wardrobe-upload">
            <input
                ref="fileInputRef"
                type="file"
                class="hidden"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                :multiple="!isEditMode"
                :disabled="busy"
                @change="onFileInputChange"
            />

            <div
                v-if="isEditMode && formData.image"
                class="wardrobe-upload__file-card"
            >
                <div class="wardrobe-upload__file-card-main">
                    <span class="wardrobe-upload__file-thumb" aria-hidden="true">
                        <img
                            :src="formData.image"
                            alt="Preview"
                            class="wardrobe-upload__file-thumb-img"
                        />
                    </span>
                    <div class="wardrobe-upload__file-details">
                        <p class="wardrobe-upload__file-name">
                            {{ $t('wardrobe_image_preview') }}
                        </p>
                        <p class="wardrobe-upload__file-meta">
                            {{ $t('click_trash_to_replace_image') }}
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
                    @click.stop="clearEditImage"
                />
            </div>

            <div
                v-if="showAddDropzone"
                class="wardrobe-upload__dropzone"
                :class="{
                    'wardrobe-upload__dropzone--compact':
                        !isEditMode && pendingImages.length > 0,
                    'wardrobe-upload__dropzone--active': isDragOver,
                    'wardrobe-upload__dropzone--disabled': busy
                }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="openFilePicker"
            >
                <span class="wardrobe-upload__dropzone-icon" aria-hidden="true">
                    <i class="pi pi-cloud-upload" />
                </span>
                <p class="wardrobe-upload__dropzone-title m-0">
                    {{
                        !isEditMode && pendingImages.length
                            ? $t('wardrobe_add_more_images')
                            : $t('drag_drop_or_browse_file')
                    }}
                </p>
                <p class="wardrobe-upload__dropzone-hint m-0">
                    {{ $t('wardrobe_upload_supported_formats') }}
                </p>
                <p class="wardrobe-upload__dropzone-hint m-0">
                    {{ uploadDimensionHint }}
                </p>
            </div>

            <div
                v-if="!isEditMode && pendingImages.length"
                class="wardrobe-upload__preview-list"
            >
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
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('core.wardrobe.delete')"
        v-model="deleteDialog"
        variant="danger"
        :header="deleteDialogHeader"
        :content="deleteDialogContent"
        @confirm="deleteItem"
    />
</template>

<style scoped>
.wardrobe-table__thumb {
    display: flex;
    align-items: center;
    padding: 0.25rem 0;
}

.wardrobe-table__thumb :deep(.p-image) {
    display: inline-flex;
}

.wardrobe-table__thumb :deep(.wardrobe-table__thumb-img),
.wardrobe-table__thumb :deep(img) {
    width: 6rem;
    aspect-ratio: 3 / 4;
    height: auto;
    object-fit: cover;
    border-radius: 0.75rem;
    cursor: pointer;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
}

.wardrobe-table__pending {
    font-size: 0.875rem;
    color: var(--p-text-muted-color, #64748b);
    font-style: italic;
}

.wardrobe-type-tag:deep(.p-tag),
:deep(.wardrobe-type-tag.p-tag) {
    font-weight: 600;
    border: 1px solid transparent;
}

.wardrobe-type-tag.wardrobe-type--t-shirt:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--t-shirt.p-tag) {
    background: #dbeafe;
    color: #1d4ed8;
    border-color: #93c5fd;
}

.wardrobe-type-tag.wardrobe-type--shirt:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--shirt.p-tag) {
    background: #e0e7ff;
    color: #4338ca;
    border-color: #a5b4fc;
}

.wardrobe-type-tag.wardrobe-type--pants:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--pants.p-tag) {
    background: #e2e8f0;
    color: #334155;
    border-color: #cbd5e1;
}

.wardrobe-type-tag.wardrobe-type--jeans:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--jeans.p-tag) {
    background: #dbeafe;
    color: #1e40af;
    border-color: #60a5fa;
}

.wardrobe-type-tag.wardrobe-type--shoes:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--shoes.p-tag) {
    background: #ffedd5;
    color: #c2410c;
    border-color: #fdba74;
}

.wardrobe-type-tag.wardrobe-type--jacket:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--jacket.p-tag) {
    background: #374151;
    color: #f9fafb;
    border-color: #4b5563;
}

.wardrobe-type-tag.wardrobe-type--sweater:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--sweater.p-tag) {
    background: #dcfce7;
    color: #15803d;
    border-color: #86efac;
}

.wardrobe-type-tag.wardrobe-type--shorts:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--shorts.p-tag) {
    background: #fef3c7;
    color: #b45309;
    border-color: #fcd34d;
}

.wardrobe-type-tag.wardrobe-type--dress:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--dress.p-tag) {
    background: #fce7f3;
    color: #be185d;
    border-color: #f9a8d4;
}

.wardrobe-type-tag.wardrobe-type--default:deep(.p-tag),
:deep(.wardrobe-type-tag.wardrobe-type--default.p-tag) {
    background: #f1f5f9;
    color: #475569;
    border-color: #cbd5e1;
}

.wardrobe-table__labels {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
}

.wardrobe-table__label-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    background: color-mix(
        in srgb,
        var(--p-primary-color, #2563eb) 10%,
        var(--p-content-background, #fff)
    );
    color: var(--p-text-color, #334155);
    font-size: 0.75rem;
    line-height: 1.2;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
}

.wardrobe-upload {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.wardrobe-upload__preview-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

:global(.wardrobe-upload-dialog .p-dialog-content) {
    max-height: min(75vh, 36rem);
    overflow-y: auto;
}

.wardrobe-upload__file-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border: 1px solid
        color-mix(
            in srgb,
            var(--p-primary-color, #2563eb) 18%,
            var(--p-content-border-color, #e2e8f0)
        );
    border-radius: 0.75rem;
    background: color-mix(
        in srgb,
        var(--p-primary-color, #2563eb) 4%,
        var(--p-content-background, #fff)
    );
}

.wardrobe-upload__file-card-main {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 0;
    flex: 1;
}

.wardrobe-upload__file-thumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 3.375rem;
    aspect-ratio: 3 / 4;
    height: auto;
    border-radius: 0.625rem;
    overflow: hidden;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    background: var(--p-content-background, #fff);
}

.wardrobe-upload__file-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.wardrobe-upload__file-details {
    min-width: 0;
}

.wardrobe-upload__file-name {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.35;
    color: var(--p-text-color, #334155);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wardrobe-upload__file-meta {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, #64748b);
}

.wardrobe-upload__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 10.5rem;
    padding: 1.5rem 1.25rem;
    border: 2px dashed var(--p-content-border-color, #cbd5e1);
    border-radius: 0.875rem;
    background: var(--p-content-background, #fff);
    cursor: pointer;
    transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        box-shadow 0.2s ease;
}

.wardrobe-upload__dropzone--active,
.wardrobe-upload__dropzone:hover:not(.wardrobe-upload__dropzone--disabled) {
    border-color: var(--p-primary-color, #2563eb);
    background: color-mix(
        in srgb,
        var(--p-primary-color, #2563eb) 5%,
        var(--p-content-background, #fff)
    );
    box-shadow: 0 0 0 3px
        color-mix(in srgb, var(--p-primary-color, #2563eb) 10%, transparent);
}

.wardrobe-upload__dropzone--compact {
    min-height: 7.5rem;
    padding: 1rem 1.25rem;
}

.wardrobe-upload__dropzone--compact .wardrobe-upload__dropzone-icon {
    width: 2.75rem;
    height: 2.75rem;
    margin-bottom: 0.5rem;
}

.wardrobe-upload__dropzone--compact .wardrobe-upload__dropzone-icon i {
    font-size: 1.25rem;
}

.wardrobe-upload__dropzone--disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.wardrobe-upload__dropzone-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    margin-bottom: 0.75rem;
    border-radius: 9999px;
    background: color-mix(
        in srgb,
        var(--p-primary-color, #2563eb) 10%,
        transparent
    );
    color: var(--p-primary-color, #2563eb);
}

.wardrobe-upload__dropzone-icon i {
    font-size: 1.5rem;
}

.wardrobe-upload__dropzone-title {
    font-size: 1rem;
    font-weight: 600;
    text-align: center;
    color: var(--p-text-color, #334155);
}

.wardrobe-upload__dropzone-hint {
    margin-top: 0.375rem;
    font-size: 0.875rem;
    text-align: center;
    color: var(--p-text-muted-color, #64748b);
}

:global(.app-dark) .wardrobe-upload__dropzone {
    border-color: #3f3f46;
    background: #18181b;
}

:global(.app-dark) .wardrobe-upload__file-card {
    border-color: #334155;
    background: #18181b;
}

:global(.app-dark) .wardrobe-upload__file-thumb {
    border-color: #3f3f46;
    background: #111113;
}

:global(.app-dark) .wardrobe-upload__file-name {
    color: #f4f4f5;
}

:global(.app-dark) .wardrobe-upload__dropzone--active,
:global(.app-dark)
    .wardrobe-upload__dropzone:hover:not(.wardrobe-upload__dropzone--disabled) {
    border-color: #52525b;
    background: #18181b;
    box-shadow: 0 0 0 1px #303036;
}

:global(.app-dark) .wardrobe-upload__dropzone-icon {
    background: #0f1f3d;
    color: #93c5fd;
}

:global(.app-dark) .wardrobe-upload__dropzone-title {
    color: #f4f4f5;
}

:global(.app-dark) .wardrobe-upload__dropzone-hint {
    color: #a1a1aa;
}

:global(.app-dark) .wardrobe-table__color-swatch {
    border-color: #3f3f46;
}

:global(.app-dark) .wardrobe-table__label-chip {
    background: #27272a;
    border-color: #3f3f46;
    color: #f4f4f5;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--t-shirt.p-tag) {
    background: #1e3a5f;
    color: #93c5fd;
    border-color: #2563eb;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--shirt.p-tag) {
    background: #312e81;
    color: #c7d2fe;
    border-color: #4f46e5;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--pants.p-tag) {
    background: #334155;
    color: #e2e8f0;
    border-color: #64748b;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--jeans.p-tag) {
    background: #1e3a8a;
    color: #bfdbfe;
    border-color: #3b82f6;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--shoes.p-tag) {
    background: #7c2d12;
    color: #fed7aa;
    border-color: #ea580c;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--jacket.p-tag) {
    background: #111827;
    color: #f3f4f6;
    border-color: #374151;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--sweater.p-tag) {
    background: #14532d;
    color: #bbf7d0;
    border-color: #22c55e;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--shorts.p-tag) {
    background: #78350f;
    color: #fde68a;
    border-color: #d97706;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--dress.p-tag) {
    background: #831843;
    color: #fbcfe8;
    border-color: #db2777;
}

:global(.app-dark) :deep(.wardrobe-type-tag.wardrobe-type--default.p-tag) {
    background: #27272a;
    color: #d4d4d8;
    border-color: #52525b;
}
</style>
