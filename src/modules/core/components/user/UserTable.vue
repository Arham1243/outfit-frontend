<script setup>
import { computed, onBeforeMount, ref, watch } from 'vue';
import { debounce } from 'lodash-es';
import { useUserStore } from '@/modules/core/stores';
import { PaginationOptions, SortFilterOptions } from '@/config';
import { useHelpers, useTableColumnFilters } from '@/composables';
import TableColumnFilter from '@/components/common/table-filters/TableColumnFilter.vue';
import {
    applyDefaultTableSort,
    DEFAULT_USER_STATUS_NAME_SORT,
    TEXT_COLUMN_FILTER,
    USER_STATUS_FILTER
} from '@/utils/tableFilters';
import { useRouter } from 'vue-router';

const { filterByPermission, resolveVisibleColumns, formatDate } = useHelpers();
const router = useRouter();
const userStore = useUserStore();

const pagination = new PaginationOptions();
const sortFilters = new SortFilterOptions();
const menu = ref();
const selectedItem = ref(null);
const loading = ref(false);
const items = ref([]);
const totalRecords = ref();
const changeStatusDialog = ref(false);
const visibleColumns = ref([]);
const columnSelectionsRef = ref(null);

const columnsMenuItems = ref([
    {
        field: 'name',
        name: $t('full_name'),
        sortable: true,
        disabled: true,
        filter: TEXT_COLUMN_FILTER
    },
    {
        field: 'role.name',
        name: $t('role'),
        sortable: true,
        filter: { type: 'autocomplete', preset: 'role' }
    },
    {
        field: 'preferred_language.name',
        name: $t('preferred_language'),
        sortable: true,
        filter: TEXT_COLUMN_FILTER
    },
    {
        field: 'email',
        name: $t('email'),
        sortable: true,
        filter: TEXT_COLUMN_FILTER
    },
    {
        field: 'gender',
        name: $t('gender'),
        sortable: true,
        filter: {
            type: 'select',
            options: [
                { label: $t('male'), value: 'male' },
                { label: $t('female'), value: 'female' }
            ]
        }
    },
    {
        field: 'date_of_birth',
        name: $t('date_of_birth'),
        sortable: true
    },
    {
        field: 'status',
        name: $t('status'),
        sortable: true,
        filter: USER_STATUS_FILTER
    }
]);

onBeforeMount(async () => {
    visibleColumns.value = columnsMenuItems.value;
    await getItems();
});

watch(visibleColumns, (newVal) => {
    const ordered = resolveVisibleColumns(newVal, columnsMenuItems.value);
    const changed =
        ordered.length !== newVal.length ||
        ordered.some((c, i) => c.field !== newVal[i]?.field);
    if (changed) {
        visibleColumns.value = ordered;
    }
});

const menuItems = computed(() => {
    if (!selectedItem.value) return [];

    const allMenuItems = [
        {
            label: $t('edit'),
            icon: 'pi pi-pencil',
            command: () => goToEdit(),
            permission: 'core.users.edit'
        },
        {
            label: isItemActive.value ? $t('make_inactive') : $t('make_active'),
            icon: isItemActive.value ? 'pi pi-times' : 'pi pi-check',
            command: () => showChangeStatusDialog(),
            permission: 'core.users.edit'
        }
    ].filter(Boolean);

    return filterByPermission(allMenuItems);
});

const isItemActive = computed(() => {
    return selectedItem.value && selectedItem.value.status === 'active';
});

const toggleColumnSelections = () => columnSelectionsRef.value.show();

const goToAddNew = () => {
    router.push({
        name: 'NewUser'
    });
};

const goToEdit = () => {
    router.push({
        name: 'EditUser',
        params: { id: selectedItem.value.uuid }
    });
};

const showChangeStatusDialog = () => {
    changeStatusDialog.value = true;
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
        const params = {
            ...pagination.getPageParams()
        };
        const payload = {
            ...sortFilters.getSortFilters(),
            includes: [{ relation: 'role' }, { relation: 'preferredLanguage' }]
        };

        applyDefaultTableSort(payload, DEFAULT_USER_STATUS_NAME_SORT);
        const res = await userStore.search(payload, params);
        items.value = res.data;
        totalRecords.value = res.meta.total;
    } finally {
        loading.value = false;
    }
};

const { primeFilters, onColumnFilter } = useTableColumnFilters({
    columnConfigs: columnsMenuItems.value,
    sortFilters,
    pagination,
    refetch: getItems
});

const debouncedSaveTablePreferences = debounce(() => {}, 500);

const changeStatus = async () => {
    try {
        loading.value = true;
        if (selectedItem.value) {
            await userStore.changeStatus(selectedItem.value.uuid, {
                status:
                    selectedItem.value.status === 'active'
                        ? 'inactive'
                        : 'active'
            });
        }
        await getItems();
        selectedItem.value = {};
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <TitleHeader>
        <template #title>
            <h1 class="text-2xl sm:text-3xl font-bold">
                {{ $t('user_management') }}
            </h1>
        </template>
        <template #actions>
            <div class="flex flex-row gap-2 items-center">
                <Button
                    variant="outlined"
                    size="medium"
                    :label="$t('columns')"
                    icon="pi pi-cog"
                    @click="toggleColumnSelections()"
                    :badge="`${visibleColumns.length}`"
                    badgeSeverity="primary"
                />
                <MultiSelect
                    filter
                    ref="columnSelectionsRef"
                    class="p-multiselect-label-empty"
                    v-model="visibleColumns"
                    @change="
                        debouncedSaveTablePreferences('users', visibleColumns)
                    "
                    :options="columnsMenuItems"
                    optionLabel="name"
                    optionDisabled="disabled"
                    style="width: 1px !important"
                />
                <Button
                    v-if="$ability.can('core.users.create')"
                    :label="$t('add_new')"
                    @click="goToAddNew"
                />
            </div>
        </template>
    </TitleHeader>

    <Card class="py-3 px-2">
        <template #content>
            <BaseTable
                dataKey="uuid"
                :reorderableColumns="true"
                class="users-table"
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
                <template #empty> {{ $t('no_users_found') }} </template>
                <Column
                    v-for="(col, idx) in visibleColumns"
                    :key="col.field + '_' + idx"
                    :field="col.field"
                    :header="col.name"
                    :sortable="col.sortable"
                    :columnKey="col.field"
                    :showFilterMenu="col.filter ? false : undefined"
                    :filterField="col.filter ? col.field : undefined"
                    class="whitespace-nowrap"
                >
                    <template v-if="col.filter" #filter="{ filterModel, filterCallback }">
                        <TableColumnFilter
                            v-model="filterModel.value"
                            :config="col.filter"
                            @apply="filterCallback()"
                        />
                    </template>
                    <template v-if="col.field === 'name'" #body="{ data }">
                        <router-link
                            v-if="$ability.can('core.users.edit')"
                            :to="{
                                name: 'EditUser',
                                params: { id: data.uuid }
                            }"
                            class="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                            {{ data.name }}
                        </router-link>
                        <span v-else>{{ data.name }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'gender'"
                        #body="{ data }"
                    >
                        <span>{{
                            data.gender === 'male'
                                ? $t('male')
                                : data.gender === 'female'
                                  ? $t('female')
                                  : '-'
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'date_of_birth'"
                        #body="{ data }"
                    >
                        <span>{{
                            data.date_of_birth
                                ? formatDate(data.date_of_birth)
                                : '-'
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'role.name'"
                        #body="{ data }"
                    >
                        <span>{{
                            data.role?.name || '-'
                        }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'preferred_language.name'"
                        #body="{ data }"
                    >
                        <span>{{ data.preferred_language?.name || '-' }}</span>
                    </template>

                    <template
                        v-else-if="col.field === 'status'"
                        #body="{ data }"
                    >
                        <StatusTag :status="data.status" />
                    </template>
                </Column>
                <Column
                    v-if="$ability.can('core.users.edit')"
                    columnKey="actions"
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

    <Confirmation
        v-if="$ability.can('core.users.edit')"
        v-model="changeStatusDialog"
        variant="danger"
        :header="isItemActive ? $t('make_inactive') : $t('make_active')"
        :content="
            $t('are_you_sure_you_want_to_make_this_user_value', {
                value: isItemActive ? 'inactive' : 'active'
            })
        "
        :confirmButtonText="
            isItemActive ? $t('make_inactive') : $t('make_active')
        "
        @confirm="changeStatus"
    />
</template>
