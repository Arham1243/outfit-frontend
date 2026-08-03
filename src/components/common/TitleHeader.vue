<script setup></script>

<template>
    <div
        class="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full mb-5"
    >
        <div><slot name="title" /></div>
        <div class="mt-4 md:mt-0 flex gap-4 justify-end">
            <slot name="actions" />
        </div>
    </div>
</template>
