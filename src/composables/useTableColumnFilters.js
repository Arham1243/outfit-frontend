import { ref } from 'vue';
import { debounce } from 'lodash-es';
import { buildPrimeFilters, primeFiltersToOrion } from '@/utils/tableFilters';

export function useTableColumnFilters({
    columnConfigs,
    sortFilters,
    pagination,
    refetch,
    fieldAliases = {},
    debounceMs = 400,
    preserveFilters = []
}) {
    const primeFilters = ref(buildPrimeFilters(columnConfigs));

    const syncFiltersFromPrime = (filters = primeFilters.value) => {
        const mappedFilters = primeFiltersToOrion(
            filters,
            columnConfigs,
            fieldAliases
        );

        const preserved = sortFilters.filters.filter((filter) =>
            preserveFilters.includes(filter.field)
        );

        sortFilters.syncFilters([...preserved, ...mappedFilters]);
    };

    syncFiltersFromPrime();

    const applyColumnFilters = (filters = primeFilters.value) => {
        syncFiltersFromPrime(filters);
        pagination.resetPageParams();
        refetch();
    };

    const debouncedApply = debounce((filters) => {
        applyColumnFilters(filters);
    }, debounceMs);

    const onColumnFilter = (event) => {
        if (event?.filters) {
            primeFilters.value = event.filters;
        }

        debouncedApply(event?.filters ?? primeFilters.value);
    };

    const initColumnFilters = (configs = columnConfigs) => {
        primeFilters.value = buildPrimeFilters(configs);
    };

    return {
        primeFilters,
        onColumnFilter,
        initColumnFilters,
        applyColumnFilters
    };
}
