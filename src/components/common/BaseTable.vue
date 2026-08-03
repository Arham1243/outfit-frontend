<script setup>
import { ref, computed, useSlots, getCurrentInstance } from 'vue';

const slots = useSlots();
const slotNames = Object.keys(slots);

const props = defineProps({
    value: { type: Array, default: () => [] },
    lazy: { type: Boolean, default: true },
    dataKey: { type: String, default: 'id' },
    rowHover: { type: Boolean, default: true },
    stripedRows: { type: Boolean, default: true },
    paginator: { type: Boolean, default: true },
    page: { type: Number, default: 1 },
    rows: { type: Number, default: 60 },
    totalRecords: { type: Number, default: 0 },
    rowsPerPageOptions: {
        type: Array,
        default: () => [60, 100, 150, 200]
    },
    scrollHeight: { type: String, default: '600px' },
    resizableColumns: { type: Boolean, default: true },
    columnFilters: { type: Boolean, default: false },
    filters: { type: Object, default: undefined }
});

const emit = defineEmits(['update:filters', 'filter', 'page']);

const localPage = ref(1);
const localRows = ref(props.rows);

const pageTemplate = computed(() => {
    let from = 0;
    let to = 0;
    if (props.lazy) {
        from = props.page * props.rows - props.rows + 1;
        const temp = props.page * props.rows;
        to = temp > props.totalRecords ? props.totalRecords : temp;
    } else {
        from = localPage.value * localRows.value - localRows.value + 1;
        const temp = localPage.value * localRows.value;
        to = temp > props.value.length ? props.value.length : temp;
    }
    const key =
        props.totalRecords === 1
            ? 'common.table.showingEntry'
            : 'common.table.showingEntries';
    return $t(key, {
        from,
        to,
        count: props.totalRecords
    });
});

const onPageChange = (event) => {
    if (!props.lazy) {
        localPage.value = event.page + 1;
        localRows.value = event.rows;
    }

    emit('page', event);
};

const onFilter = (event) => {
    emit('filter', event);
};

const onFiltersUpdate = (value) => {
    emit('update:filters', value);
};
</script>

<template>
    <DataTable
        :resizableColumns="resizableColumns"
        columnResizeMode="expand"
        v-bind="$attrs"
        :lazy="lazy"
        :value="value"
        :data-key="dataKey"
        :row-hover="rowHover"
        :striped-rows="stripedRows"
        :paginator="paginator"
        :first="page * rows - rows"
        :rows="rows"
        removableSort
        :total-records="totalRecords"
        :rows-per-page-options="rowsPerPageOptions"
        :current-page-report-template="totalRecords > 0 ? pageTemplate : ''"
        :paginator-template="
            totalRecords > 0
                ? 'CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown'
                : ''
        "
        :scrollable="true"
        :scroll-height="scrollHeight"
        breakpoint="960px"
        :filters="filters"
        :filter-display="columnFilters ? 'row' : undefined"
        @update:filters="onFiltersUpdate"
        @filter="onFilter"
        @page="onPageChange"
    >
        <template
            v-for="(name, index) of slotNames"
            :key="index"
            #[name]="slotProps"
        >
            <slot :name="name" v-bind="slotProps || {}" />
        </template>
    </DataTable>
</template>
