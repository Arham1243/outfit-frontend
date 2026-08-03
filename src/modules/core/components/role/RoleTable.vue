<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import { useRoleStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useHelpers, useTableColumnFilters } from '@/composables';
import TableColumnFilter from '@/components/common/table-filters/TableColumnFilter.vue';
import {
    applyDefaultTableSort,
    STATUS_ACTIVE_INACTIVE_FILTER,
    TEXT_COLUMN_FILTER
} from '@/utils/tableFilters';
import { getValidationErrorMessage } from '@/utils/apiErrors';

const globalStore = useGlobalStore();
const router = useRouter();
const roleStore = useRoleStore();
const { t } = useI18n();
const { filterByPermission } = useHelpers();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const showDialog = ref(false);
const isEditMode = ref(false);
const changeStatusDialog = ref(false);
const deleteDialog = ref(false);
const busy = ref(false);
const totalRecords = ref();
const formData = ref({
    name: '',
    status: true
});

onBeforeMount(async () => {
    await getItems();
});

const isSystemRole = (row) => !!(row?.is_system || row?.system);

const isItemSystem = computed(() => isSystemRole(selectedItem.value));

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status;
});

const isRoleInUse = computed(() => {
    return selectedItem.value && selectedItem.value.is_in_use;
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const entries = [
        {
            label: t('edit'),
            icon: 'pi pi-pencil',
            command: () => editItem(),
            permission: 'core.roles.edit'
        },
        !isItemSystem.value && {
            label: t('permissions'),
            icon: 'pi pi-cog',
            command: () =>
                router.push({
                    name: 'RolePermissions',
                    params: { id: selectedItem.value.uuid }
                }),
            permission: 'core.roles.edit'
        },
        !isItemSystem.value && {
            label: isItemActive.value ? t('make_inactive') : t('make_active'),
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            disabled: isItemActive.value && isRoleInUse.value,
            permission: 'core.roles.edit'
        },
        {
            label: t('delete'),
            icon: 'pi pi-trash',
            command: () => showDeleteDialog(),
            permission: 'core.roles.delete'
        }
    ].filter(Boolean);

    return filterByPermission(entries);
});

const openDialog = (mode = 'add') => {
    isEditMode.value = mode === 'edit';
    showDialog.value = true;
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
};

const showDeleteDialog = () => {
    deleteDialog.value = true;
};

const closeDialog = () => {
    showDialog.value = false;
    resetForm();
};

const onShow = () => {
    resetForm();
};

const resetForm = () => {
    formData.value.name = '';
    formData.value.status = true;
    globalStore.clearErrors();
};

const editItem = () => {
    resetForm();
    formData.value.name = selectedItem.value.name;
    formData.value.status = selectedItem.value.status;
    openDialog('edit');
};

const showActions = (event, item) => {
    selectedItem.value = item;
    menu.value.toggle(event);
};

const onSortChange = (event) => {
    pagination.resetPageParams();
    sortFilters.updateSortFilters(event);
    getItems();
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

        applyDefaultTableSort(payload);

        const res = await roleStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const filterColumnConfigs = [
    { field: 'name', filter: TEXT_COLUMN_FILTER },
    { field: 'status', filter: STATUS_ACTIVE_INACTIVE_FILTER }
];

const { primeFilters, onColumnFilter } = useTableColumnFilters({
    columnConfigs: filterColumnConfigs,
    sortFilters,
    pagination,
    refetch: getItems
});

const changeStatus = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await roleStore.changeStatus(selectedItem.value.uuid);
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};

const deleteItem = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await roleStore.deleteItem(selectedItem.value.uuid);
        }
        deleteDialog.value = false;
        await getItems();
        selectedItem.value = {};
    } catch (error) {
        deleteDialog.value = false;
        globalStore.showError(
            t('cannot_delete'),
            getValidationErrorMessage(error, t('something_went_wrong'))
        );
    } finally {
        loading.value = false;
    }
};

const save = async () => {
    try {
        const payload = {
            name: formData.value.name,
            status: formData.value.status
        };
        busy.value = true;
        if (isEditMode.value) {
            await roleStore.update(selectedItem.value.uuid, payload);
        } else {
            await roleStore.create(payload);
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
</script>

<template>
    <TitleHeader>
        <template #title>
            <h1 class="text-2xl sm:text-3xl font-bold">
                {{ $t('user_roles') }}
            </h1>
        </template>
        <template #actions>
            <Button
                v-if="$ability.can('core.roles.create')"
                :label="$t('add_new')"
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
                :column-filters="true"
                v-model:filters="primeFilters"
                @filter="onColumnFilter"
                @sort="onSortChange"
                @page="onPageChange"
            >
                <template #empty> {{ $t('no_roles_found') }} </template>
                <Column
                    columnKey="name"
                    class="w-[30rem]"
                    :sortable="true"
                    field="name"
                    :header="$t('role_name')"
                    :showFilterMenu="false"
                    filterField="name"
                >
                    <template #filter="{ filterModel, filterCallback }">
                        <TableColumnFilter
                            v-model="filterModel.value"
                            :config="TEXT_COLUMN_FILTER"
                            @apply="filterCallback()"
                        />
                    </template>
                    <template #body="{ data }">
                        <span>{{ data.name }}</span>
                    </template>
                </Column>

                <Column
                    columnKey="status"
                    :header="$t('status')"
                    :sortable="true"
                    field="status"
                    :showFilterMenu="false"
                    filterField="status"
                >
                    <template #filter="{ filterModel, filterCallback }">
                        <TableColumnFilter
                            v-model="filterModel.value"
                            :config="STATUS_ACTIVE_INACTIVE_FILTER"
                            @apply="filterCallback()"
                        />
                    </template>
                    <template #body="{ data }">
                        <StatusTag
                            :status="data.status ? 'active' : 'inactive'"
                        />
                    </template>
                </Column>

                <Column columnKey="system" field="is_system" class="text-right">
                    <template #body="{ data }">
                        <i
                            v-if="isSystemRole(data)"
                            class="pi pi-lock text-red-500 !text-xl opacity-90"
                        ></i>
                    </template>
                </Column>

                <Column
                    columnKey="actions"
                    v-if="
                        $ability.can('core.roles.edit') ||
                        $ability.can('core.roles.delete')
                    "
                    :header="$t('actions')"
                    class="flex justify-end"
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
            $ability.can('core.roles.edit') ||
            $ability.can('core.roles.create')
        "
        v-model:visible="showDialog"
        @update:visible="onShow"
        :busy="busy"
        :isEditMode="isEditMode"
        :header="isEditMode ? $t('edit_role') : $t('new_role')"
        :confirmLabel="isEditMode ? $t('update') : $t('save')"
        :formData="formData"
        :initialData="isEditMode ? selectedItem : null"
        :enableDirtyCheck="true"
        @cancel="closeDialog"
        @confirm="save"
    >
        <div class="mb-3 col-span-12">
            <label class="block required mb-3" for="name">{{
                $t('role_name')
            }}</label>
            <InputField
                variant="text"
                id="name"
                v-model="formData.name"
                class="w-full"
                @keyup.enter="save"
                :disabled="busy"
            />
        </div>

        <div class="mb-3 col-span-12">
            <label class="block mb-3">{{ $t('status') }}</label>
            <div class="flex items-center gap-3">
                <InputField
                    inputId="role-status"
                    variant="switch"
                    v-model="formData.status"
                    :disabled="
                        busy ||
                        (isEditMode &&
                            selectedItem?.is_in_use &&
                            formData.status)
                    "
                />
                <label class="cursor-pointer" for="role-status">{{
                    formData.status ? $t('active') : $t('inactive')
                }}</label>
            </div>
        </div>
    </BaseDialog>

    <Confirmation
        v-if="$ability.can('core.roles.delete')"
        v-model="deleteDialog"
        variant="danger"
        :header="$t('delete_role')"
        :content="$t('are_you_sure_you_want_to_delete_this_role')"
        @confirm="deleteItem"
    />

    <Confirmation
        v-if="$ability.can('core.roles.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? $t('make_inactive') : $t('make_active')"
        :content="
            $t('are_you_sure_you_want_to_make_this_role_value', {
                value: isItemActive ? 'inactive' : 'active'
            })
        "
        :confirmButtonText="
            isItemActive ? $t('make_inactive') : $t('make_active')
        "
        @confirm="changeStatus"
    />
</template>
