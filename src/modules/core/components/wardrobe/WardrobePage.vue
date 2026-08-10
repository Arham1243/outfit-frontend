<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useWardrobeStore } from '@/modules/core/stores';
import { WardrobeService } from '@/modules/core/services';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers } from '@/composables';
import { getValidationErrorMessage } from '@/utils/apiErrors';
import { ability } from '@/plugins/ability';
import WardrobeHeader from './WardrobeHeader.vue';
import WardrobeToolbar from './WardrobeToolbar.vue';
import WardrobeSelectionBar from './WardrobeSelectionBar.vue';
import WardrobeGrid from './WardrobeGrid.vue';
import WardrobeAddDialog from './WardrobeAddDialog.vue';
import WardrobeBulkUploadDialog from './WardrobeBulkUploadDialog.vue';
import WardrobeEditDialog from './WardrobeEditDialog.vue';
import WardrobeViewDialog from './WardrobeViewDialog.vue';
import WardrobeDeleteDialog from './WardrobeDeleteDialog.vue';
import { getLatestUpdatedAt } from './wardrobeDisplay';

const CLASSIFICATION_POLL_INTERVAL_MS = 3000;
const CLASSIFICATION_POLL_MAX_MS = 120000;
const SEARCH_DEBOUNCE_MS = 300;

const helpers = useHelpers();
const { formatDate } = helpers;

const wardrobeStore = useWardrobeStore();
const globalStore = useGlobalStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();

const loading = ref(false);
const busy = ref(false);
const items = ref([]);
const totalRecords = ref(0);
const typeCounts = ref({});
const wardrobeTotal = ref(0);
const searchQuery = ref('');
const selectedTypeFilter = ref(null);
const selectedItems = ref([]);
const selectedItem = ref(null);
const selectMode = ref(false);

const showAddDialog = ref(false);
const showBulkDialog = ref(false);
const showEditDialog = ref(false);
const showViewDialog = ref(false);
const showDeleteDialog = ref(false);
const isBulkDelete = ref(false);

let classificationPollTimer = null;
let classificationPollStartedAt = null;
let searchDebounceTimer = null;

const hasItemsPendingClassification = computed(() =>
    items.value.some((item) => !item.type)
);

const canCreate = computed(() => ability.can('core.wardrobe.create'));
const canEdit = computed(() => ability.can('core.wardrobe.edit'));
const canDelete = computed(() => ability.can('core.wardrobe.delete'));

const lastUpdatedLabel = computed(() => {
    const latest = getLatestUpdatedAt(items.value);
    if (!latest) return $t('wardrobe_last_updated_never');

    const latestDay = formatDate(latest, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const today = formatDate(new Date(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return latestDay === today
        ? $t('wardrobe_last_updated_today')
        : latestDay;
});

onBeforeMount(async () => {
    await Promise.all([getItems(), loadTypeCounts()]);
});

onBeforeUnmount(() => {
    stopClassificationPolling();
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }
});

watch(hasItemsPendingClassification, (pending) => {
    if (pending) {
        startClassificationPolling();
    } else {
        stopClassificationPolling();
    }
});

watch(searchQuery, (value) => {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
        sortFilters.updateSearch(value.trim());
        pagination.resetPageParams();
        selectedItems.value = [];
        getItems();
    }, SEARCH_DEBOUNCE_MS);
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
        // Ignore transient poll failures.
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

async function loadTypeCounts() {
    try {
        const res = await wardrobeStore.fetchTypeCounts();
        typeCounts.value = res.data ?? {};
        wardrobeTotal.value = res.total ?? 0;
    } catch {
        typeCounts.value = {};
        wardrobeTotal.value = 0;
    }
}

async function getItems() {
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
}

async function refreshAll() {
    await Promise.all([getItems(), loadTypeCounts()]);
}

function onPageChange(event) {
    pagination.updatePageParams(event);
    selectedItems.value = [];
    getItems();
}

function applyTypeFilter(type) {
    selectedTypeFilter.value = type;
    sortFilters.updateFilters('type', type);
    pagination.resetPageParams();
    selectedItems.value = [];
    getItems();
}

function toggleSelectMode() {
    selectMode.value = !selectMode.value;
    if (!selectMode.value) {
        selectedItems.value = [];
    }
}

function openItem(item) {
    if (selectMode.value) return;
    selectedItem.value = item;
    showViewDialog.value = true;
}

function toggleItemSelection(item) {
    const index = selectedItems.value.findIndex(
        (entry) => entry.uuid === item.uuid
    );

    if (index >= 0) {
        selectedItems.value = selectedItems.value.filter(
            (entry) => entry.uuid !== item.uuid
        );
        return;
    }

    selectedItems.value = [...selectedItems.value, item];
}

function selectPage() {
    const merged = [...selectedItems.value];
    items.value.forEach((item) => {
        if (!merged.some((entry) => entry.uuid === item.uuid)) {
            merged.push(item);
        }
    });
    selectedItems.value = merged;
}

function openDeleteDialog(bulk = false) {
    isBulkDelete.value = bulk;
    showDeleteDialog.value = true;
}

async function handleAddSave(payload) {
    try {
        busy.value = true;
        await wardrobeStore.create({
            image: payload.image,
            name: payload.name,
            type: payload.type || undefined
        });
        showAddDialog.value = false;
        await refreshAll();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
}

async function handleBulkSave(images) {
    try {
        busy.value = true;
        const silent = images.length > 1;

        for (const image of images) {
            await wardrobeStore.create({ image }, { silent });
        }

        if (silent) {
            globalStore.showSuccess(
                $t('wardrobe_created'),
                $t('wardrobe_images_uploaded_successfully', {
                    count: images.length
                })
            );
        }

        showBulkDialog.value = false;
        await refreshAll();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
}

async function handleEditSave(payload) {
    if (!selectedItem.value) return;

    try {
        busy.value = true;
        await wardrobeStore.update(selectedItem.value.uuid, payload);
        showEditDialog.value = false;
        showViewDialog.value = false;
        await refreshAll();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
}

async function handleDeleteConfirm() {
    try {
        loading.value = true;

        if (isBulkDelete.value) {
            const uuids = selectedItems.value.map((item) => item.uuid);
            if (uuids.length) {
                await wardrobeStore.bulkDelete(uuids);
            }
            selectedItems.value = [];
            selectMode.value = false;
        } else if (selectedItem.value) {
            await wardrobeStore.deleteItem(selectedItem.value.uuid);
            selectedItems.value = selectedItems.value.filter(
                (item) => item.uuid !== selectedItem.value.uuid
            );
        }

        showDeleteDialog.value = false;
        showViewDialog.value = false;
        isBulkDelete.value = false;
        selectedItem.value = null;
        await refreshAll();
    } catch (error) {
        showDeleteDialog.value = false;
        isBulkDelete.value = false;
        globalStore.showError(
            $t('cannot_delete'),
            getValidationErrorMessage(error, $t('something_went_wrong'))
        );
    } finally {
        loading.value = false;
    }
}

function openEditFromView() {
    showViewDialog.value = false;
    showEditDialog.value = true;
}

function openDeleteFromView() {
    isBulkDelete.value = false;
    showViewDialog.value = false;
    showDeleteDialog.value = true;
}
</script>

<template>
    <div class="wardrobe-page">
        <WardrobeHeader
            :total="wardrobeTotal"
            :type-counts="typeCounts"
            :last-updated-label="lastUpdatedLabel"
            :can-create="canCreate"
            @bulk-upload="showBulkDialog = true"
            @add-item="showAddDialog = true"
        />

        <WardrobeToolbar
            v-model:search-query="searchQuery"
            :selected-type="selectedTypeFilter"
            :type-counts="typeCounts"
            :total="wardrobeTotal"
            :select-mode="selectMode"
            :can-delete="canDelete"
            @select-type="applyTypeFilter"
            @toggle-select="toggleSelectMode"
        />

        <WardrobeSelectionBar
            v-if="selectMode && canDelete"
            :selected-count="selectedItems.length"
            :page-count="items.length"
            @select-page="selectPage"
            @delete="openDeleteDialog(true)"
            @done="toggleSelectMode"
        />

        <WardrobeGrid
            :items="items"
            :loading="loading"
            :select-mode="selectMode"
            :selected-items="selectedItems"
            :can-select="canDelete"
            @open-item="openItem"
            @toggle-item="toggleItemSelection"
        />

        <Paginator
            v-if="totalRecords > pagination.limit"
            class="wardrobe-page__paginator"
            :rows="pagination.limit"
            :totalRecords="totalRecords"
            :rowsPerPageOptions="pagination.rowsPerPageOptions"
            :first="(pagination.page - 1) * pagination.limit"
            @page="onPageChange"
        />

        <WardrobeAddDialog
            v-if="canCreate"
            v-model:visible="showAddDialog"
            :busy="busy"
            @save="handleAddSave"
        />

        <WardrobeBulkUploadDialog
            v-if="canCreate"
            v-model:visible="showBulkDialog"
            :busy="busy"
            @save="handleBulkSave"
        />

        <WardrobeViewDialog
            v-model:visible="showViewDialog"
            :item="selectedItem"
            :can-edit="canEdit"
            :can-delete="canDelete"
            @edit="openEditFromView"
            @delete="openDeleteFromView"
        />

        <WardrobeEditDialog
            v-if="canEdit"
            v-model:visible="showEditDialog"
            :item="selectedItem"
            :busy="busy"
            @save="handleEditSave"
        />

        <WardrobeDeleteDialog
            v-if="canDelete"
            v-model:visible="showDeleteDialog"
            :busy="loading"
            :item="selectedItem"
            :bulk-count="selectedItems.length"
            :is-bulk="isBulkDelete"
            @confirm="handleDeleteConfirm"
        />
    </div>
</template>
