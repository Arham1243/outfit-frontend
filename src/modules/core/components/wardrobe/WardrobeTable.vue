<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useWardrobeStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { getValidationErrorMessage } from '@/utils/apiErrors';

const ACCEPTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const helpers = useHelpers();
const { filterFileFields } = helpers;

const wardrobeStore = useWardrobeStore();
const globalStore = useGlobalStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const isEditMode = ref(false);
const busy = ref(false);
const totalRecords = ref();
const showDialog = ref(false);
const deleteDialog = ref(false);
const isDragOver = ref(false);
const fileInputRef = ref(null);
const formData = ref({
    image: null
});
/** Pending base64 images for multi-create */
const pendingImages = ref([]);

const dialogHeader = computed(() =>
    isEditMode.value ? $t('edit_wardrobe_image') : $t('add_new_item')
);
const dialogFormData = computed(() =>
    isEditMode.value ? formData.value : { images: pendingImages.value }
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
    deleteDialog.value = true;
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const onPageChange = (event) => {
    pagination.updatePageParams(event);
    getItems();
};

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

    const results = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
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
            for (const image of pendingImages.value) {
                await wardrobeStore.create({ image }, { silent });
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
        if (selectedItem.value) {
            await wardrobeStore.deleteItem(selectedItem.value.uuid);
        }
        deleteDialog.value = false;
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        deleteDialog.value = false;
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
                    columnKey="image"
                    field="image"
                    :header="$t('image')"
                    style="width: 12rem"
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
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
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
                v-if="!isEditMode && pendingImages.length"
                class="wardrobe-upload__pending mb-3"
            >
                <div
                    v-for="(img, index) in pendingImages"
                    :key="index"
                    class="wardrobe-upload__pending-item"
                >
                    <img :src="img" alt="Preview" />
                    <Button
                        icon="pi pi-times"
                        severity="danger"
                        rounded
                        text
                        size="small"
                        class="wardrobe-upload__pending-remove"
                        :disabled="busy"
                        @click="removePendingImage(index)"
                    />
                </div>
            </div>

            <div
                class="wardrobe-upload__dropzone"
                :class="{
                    'wardrobe-upload__dropzone--edit': isEditMode,
                    'wardrobe-upload__dropzone--active': isDragOver,
                    'wardrobe-upload__dropzone--disabled': busy
                }"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
                @drop="onDrop"
                @click="openFilePicker"
            >
                <div
                    v-if="isEditMode && formData.image"
                    class="wardrobe-upload__current"
                >
                    <img
                        :src="formData.image"
                        alt="Preview"
                        class="wardrobe-upload__current-img"
                    />
                </div>
                <span class="wardrobe-upload__dropzone-icon" aria-hidden="true">
                    <i class="pi pi-cloud-upload" />
                </span>
                <p class="wardrobe-upload__dropzone-title m-0">
                    {{ $t('drag_drop_or_browse_file') }}
                </p>
                <p class="wardrobe-upload__dropzone-hint m-0">
                    {{ $t('wardrobe_upload_supported_formats') }}
                </p>
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('core.wardrobe.delete')"
        v-model="deleteDialog"
        variant="danger"
        :header="$t('delete_wardrobe_image')"
        :content="$t('are_you_sure_you_want_to_delete_this_wardrobe_image')"
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
    width: 7.5rem;
    height: 7.5rem;
    object-fit: cover;
    border-radius: 0.75rem;
    cursor: pointer;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
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

.wardrobe-upload__pending {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
}

.wardrobe-upload__pending-item {
    position: relative;
}

.wardrobe-upload__pending-item img {
    height: 6rem;
    width: 100%;
    object-fit: cover;
    border-radius: 0.625rem;
}

.wardrobe-upload__pending-remove {
    position: absolute !important;
    top: 0;
    right: 0;
}

.wardrobe-upload__dropzone--edit {
    min-height: 19rem;
    border-style: solid;
    background: color-mix(
        in srgb,
        var(--p-surface-50, #f8fafc) 92%,
        var(--p-content-background, #fff)
    );
}

.wardrobe-upload__current {
    display: flex;
    align-items: center;
    justify-content: center;
    width: min(100%, 18rem);
    height: 12rem;
    margin-bottom: 1rem;
    padding: 1rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.625rem;
    background: var(--p-content-background, #fff);
}

.wardrobe-upload__current-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 0.375rem;
}

:global(.app-dark) .wardrobe-upload__dropzone {
    border-color: #3f3f46;
    background: #18181b;
}

:global(.app-dark) .wardrobe-upload__dropzone--edit {
    background: #111113;
}

:global(.app-dark) .wardrobe-upload__dropzone--active,
:global(.app-dark)
    .wardrobe-upload__dropzone:hover:not(.wardrobe-upload__dropzone--disabled) {
    border-color: #52525b;
    background: #18181b;
    box-shadow: 0 0 0 1px #303036;
}

:global(.app-dark) .wardrobe-upload__current {
    border-color: #2f3037;
    background: #202123;
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
</style>
