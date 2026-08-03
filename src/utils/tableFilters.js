import { FilterMatchMode } from '@primevue/core/api';

const DEFAULT_MATCH_MODES = {
    text: FilterMatchMode.CONTAINS,
    select: FilterMatchMode.EQUALS,
    boolean: FilterMatchMode.EQUALS,
    autocomplete: FilterMatchMode.EQUALS,
    number: FilterMatchMode.EQUALS
};

const DEFAULT_OPERATORS = {
    text: 'like',
    select: '=',
    boolean: '=',
    autocomplete: 'like',
    number: '='
};

export function resolveFilterField(field, fieldAliases = {}) {
    return fieldAliases[field] ?? field;
}

export const ACTIVE_STATUS_VALUE = 1;
export const USER_ACTIVE_STATUS_VALUE = 'active';

export const DEFAULT_STATUS_NAME_SORT = [
    { field: 'status', direction: 'desc' },
    { field: 'name', direction: 'asc' }
];

export const DEFAULT_USER_STATUS_NAME_SORT = [
    { field: 'status', direction: 'asc' },
    { field: 'name', direction: 'asc' }
];

export function getDefaultFilterValue(column) {
    if (!column?.filter) {
        return null;
    }

    if (column.filter.defaultValue !== undefined) {
        return column.filter.defaultValue;
    }

    if (column.filter.type === 'select') {
        const hasActiveInactiveOptions = column.filter.options?.some(
            (option) => option.value === ACTIVE_STATUS_VALUE
        );

        if (hasActiveInactiveOptions) {
            return ACTIVE_STATUS_VALUE;
        }

        const hasUserStatusOptions = column.filter.options?.some(
            (option) => option.value === USER_ACTIVE_STATUS_VALUE
        );

        if (hasUserStatusOptions) {
            return USER_ACTIVE_STATUS_VALUE;
        }
    }

    return null;
}

export function applyDefaultTableSort(
    payload,
    sort = DEFAULT_STATUS_NAME_SORT
) {
    if (!payload.sort || payload.sort.length === 0) {
        payload.sort = sort;
    }

    return payload;
}

export function buildPrimeFilters(columnConfigs = []) {
    const filters = {};

    for (const column of columnConfigs) {
        if (!column?.filter || !column.field) {
            continue;
        }

        const matchMode =
            column.filter.matchMode ??
            DEFAULT_MATCH_MODES[column.filter.type] ??
            FilterMatchMode.CONTAINS;

        filters[column.field] = {
            value: getDefaultFilterValue(column),
            matchMode
        };
    }

    return filters;
}

function isEmptyFilterValue(value) {
    if (value === null || value === undefined || value === '') {
        return true;
    }

    if (Array.isArray(value) && value.length === 0) {
        return true;
    }

    return false;
}

function formatFilterValue(value, filterType, operator) {
    if (
        (filterType === 'text' || filterType === 'autocomplete') &&
        (operator === 'like' || operator === 'ilike')
    ) {
        return `%${value}%`;
    }

    return value;
}

export function primeFiltersToOrion(
    primeFilters = {},
    columnConfigs = [],
    fieldAliases = {}
) {
    const columnMap = Object.fromEntries(
        columnConfigs.filter((col) => col?.field).map((col) => [col.field, col])
    );

    const orionFilters = [];

    for (const [field, filterMeta] of Object.entries(primeFilters)) {
        const column = columnMap[field];
        if (!column?.filter) {
            continue;
        }

        const value =
            filterMeta && typeof filterMeta === 'object' && 'value' in filterMeta
                ? filterMeta.value
                : filterMeta;

        if (isEmptyFilterValue(value)) {
            continue;
        }

        const filterType = column.filter.type ?? 'text';
        const operator =
            column.filter.operator ??
            DEFAULT_OPERATORS[filterType] ??
            '=';

        let normalizedValue = value;
        if (filterType === 'number') {
            normalizedValue = Number(value);
            if (Number.isNaN(normalizedValue)) {
                continue;
            }
        }

        orionFilters.push({
            field: resolveFilterField(field, fieldAliases),
            operator,
            value: formatFilterValue(normalizedValue, filterType, operator)
        });
    }

    return orionFilters;
}

export const TABLE_FILTER_PRESETS = {
    statusActiveInactive: {
        type: 'select',
        options: [
            { label: 'Active', value: 1 },
            { label: 'Inactive', value: 0 }
        ]
    },
    statusActiveInactiveBoolean: {
        type: 'select',
        options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false }
        ]
    },
    text: { type: 'text' },
    number: { type: 'number' }
};

export const STATUS_ACTIVE_INACTIVE_FILTER = TABLE_FILTER_PRESETS.statusActiveInactive;
export const TEXT_COLUMN_FILTER = TABLE_FILTER_PRESETS.text;
export const NUMBER_COLUMN_FILTER = TABLE_FILTER_PRESETS.number;
export const BOOLEAN_YES_NO_FILTER = TABLE_FILTER_PRESETS.statusActiveInactiveBoolean;

export const USER_STATUS_FILTER = {
    type: 'select',
    options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Pending', value: 'pending' }
    ]
};

export function withTextFilter(column) {
    return { ...column, filter: { type: 'text' } };
}

export function withSelectFilter(column, options) {
    return { ...column, filter: { type: 'select', options } };
}

export function withAutocompleteFilter(column, preset) {
    return { ...column, filter: { type: 'autocomplete', preset } };
}
