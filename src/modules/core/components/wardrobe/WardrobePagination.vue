<script setup>
import { computed } from 'vue';

const props = defineProps({
    page: { type: Number, required: true },
    totalRecords: { type: Number, required: true },
    pageSize: { type: Number, required: true }
});

const emit = defineEmits(['page-change']);

const totalPages = computed(() =>
    Math.max(1, Math.ceil(props.totalRecords / props.pageSize))
);

const pages = computed(() =>
    Array.from({ length: totalPages.value }, (_, index) => index + 1)
);

const isFirstPage = computed(() => props.page <= 1);
const isLastPage = computed(() => props.page >= totalPages.value);

function goToPage(pageNumber) {
    if (
        pageNumber === props.page ||
        pageNumber < 1 ||
        pageNumber > totalPages.value
    ) {
        return;
    }

    emit('page-change', {
        page: pageNumber - 1,
        rows: props.pageSize
    });
}

function goPrev() {
    goToPage(props.page - 1);
}

function goNext() {
    goToPage(props.page + 1);
}
</script>

<template>
    <nav class="wardrobe-pagination" aria-label="Pagination">
        <Button
            type="button"
            label="Prev"
            icon="pi pi-chevron-left"
            iconPos="left"
            variant="outlined"
            size="small"
            severity="secondary"
            :disabled="isFirstPage"
            @click="goPrev"
        />

        <Button
            v-for="pageNumber in pages"
            :key="pageNumber"
            type="button"
            :label="String(pageNumber)"
            size="small"
            :variant="pageNumber === page ? undefined : 'outlined'"
            :severity="pageNumber === page ? 'primary' : 'secondary'"
            :aria-current="pageNumber === page ? 'page' : undefined"
            @click="goToPage(pageNumber)"
        />

        <Button
            type="button"
            label="Next"
            icon="pi pi-chevron-right"
            iconPos="right"
            variant="outlined"
            size="small"
            severity="secondary"
            :disabled="isLastPage"
            @click="goNext"
        />
    </nav>
</template>
