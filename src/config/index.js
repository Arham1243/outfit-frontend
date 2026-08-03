export class PaginationOptions {
    constructor(page = 1, limit = 60, options = [60, 100, 150, 200]) {
        this.page = page;
        this.limit = limit;
        this.rowsPerPageOptions = options;
    }

    getPageParams = () => {
        return {
            page: this.page,
            limit: this.limit
        };
    };

    resetPageParams = () => {
        this.page = 1;
    };

    updatePageParams = (event) => {
        this.page = event.page + 1;
        this.limit = event.rows;
    };
}

export class SortFilterOptions {
    constructor(search = '', sort = [], filters = []) {
        this.search = search;
        this.sort = sort;
        this.filters = filters;
    }

    getSortFilters = () => {
        return {
            search: {
                value: this.search
            },
            sort: this.sort,
            filters: this.filters
        };
    };

    resetSortFilters = () => {
        this.search = '';
        this.sort = [];
        this.filters = [];
    };

    updateSearch = (search) => {
        this.search = search;
    };

    updateSortFilters = (event) => {
        if (event && event.sortField) {
            this.sort = [
                {
                    field: event.sortField,
                    direction: event.sortOrder == 1 ? 'asc' : 'desc'
                }
            ];
        } else this.sort = [];
    };

    updateFilters = (field, value, operator = '=') => {
        const existingFilterIndex = this.filters.findIndex(
            (filter) => filter.field === field
        );

        if (this.isEmptyFilterValue(value)) {
            if (existingFilterIndex !== -1) {
                this.filters.splice(existingFilterIndex, 1);
            }
            return;
        }

        if (existingFilterIndex !== -1) {
            this.filters[existingFilterIndex] = { field, operator, value };
        } else {
            this.filters.push({ field, operator, value });
        }
    };

    removeFilter = (field) => {
        this.filters = this.filters.filter((filter) => filter.field !== field);
    };

    clearFilters = () => {
        this.filters = [];
    };

    syncFilters = (filterEntries = []) => {
        this.filters = filterEntries.filter(
            (filter) => !this.isEmptyFilterValue(filter?.value)
        );
    };

    isEmptyFilterValue = (value) => {
        if (value === null || value === undefined || value === '') {
            return true;
        }

        if (Array.isArray(value) && value.length === 0) {
            return true;
        }

        return false;
    };
}

export * from './enums';
