<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import useEventsBus from '@/composables/useEventsBus';

const route = useRoute();
const items = ref([]);
const home = ref({
    icon: 'pi pi-home',
    route: '/'
});

const { bus } = useEventsBus();

function setBreadcrumbRoutes() {
    if (route.meta.breadcrumb) {
        items.value = route.meta.breadcrumb.map((item) => ({
            ...item,
            label: $t(item.label)
        }));
    }
}

watch(
    route,
    () => {
        setBreadcrumbRoutes();
    },
    { immediate: true }
);

watch(
    () => bus.value.get('updateDetailsBreadcrumb'),
    (val) => {
        if (!val || !val[0]) return;

        const firstLabel = typeof val[0] === 'string' ? val[0] : String(val[0]);

        setBreadcrumbRoutes();
        items.value.push({
            label: firstLabel.charAt(0).toUpperCase() + firstLabel.slice(1)
        });
    }
);
</script>

<template>
    <div class="global-breadcrumbs">
        <Breadcrumb :home="home" :model="items">
            <template #item="{ item, props }">
                <router-link
                    v-if="item.route"
                    v-slot="{ href, navigate }"
                    :to="item.route"
                    custom
                >
                    <a :href="href" v-bind="props.action" @click="navigate">
                        <span
                            v-if="item.icon"
                            :class="[item.icon, 'text-color']"
                        />
                        <span class="">{{ item.label }}</span>
                    </a>
                </router-link>
                <a
                    v-else
                    :href="item.url"
                    :target="item.target"
                    v-bind="props.action"
                >
                    <span class="">{{ item.label }}</span>
                </a>
            </template>
        </Breadcrumb>
    </div>
</template>
