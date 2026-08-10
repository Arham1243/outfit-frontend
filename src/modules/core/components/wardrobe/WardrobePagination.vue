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
    if (pageNumber === props.page || pageNumber < 1 || pageNumber > totalPages.value) {
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
        <button
            type="button"
            class="wardrobe-pagination__nav wardrobe-pagination__nav--prev"
            :disabled="isFirstPage"
            @click="goPrev"
        >
            <span aria-hidden="true">&lt;</span>
            <span>Prev</span>
        </button>

        <button
            v-for="pageNumber in pages"
            :key="pageNumber"
            type="button"
            class="wardrobe-pagination__page"
            :class="{ 'wardrobe-pagination__page--active': pageNumber === page }"
            :aria-current="pageNumber === page ? 'page' : undefined"
            :disabled="pageNumber === page"
            @click="goToPage(pageNumber)"
        >
            {{ pageNumber }}
        </button>

        <button
            type="button"
            class="wardrobe-pagination__nav wardrobe-pagination__nav--next"
            :disabled="isLastPage"
            @click="goNext"
        >
            <span>Next</span>
            <span aria-hidden="true">&gt;</span>
        </button>
    </nav>
</template>
