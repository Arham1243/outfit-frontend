<script setup>
import { computed } from 'vue';
import AppSubMenu from './AppSubMenu.vue';
import { useSessionStore } from '@/stores';
import menuItems from '@/static/menuItems.json';

const sessionStore = useSessionStore();

const hasPermission = (requiredPermissions) => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
    }

    const userPermissions = sessionStore.permissions || [];
    return requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
    );
};

const decorateMenuItems = (items) => {
    return items
        .map((item) => {
            if (!hasPermission(item.permissions)) {
                return null;
            }

            if (item.items && item.items.length > 0) {
                const decoratedChildren = decorateMenuItems(item.items);

                if (decoratedChildren.length === 0 && !item.to) {
                    return null;
                }

                return {
                    ...item,
                    items: decoratedChildren
                };
            }

            return { ...item };
        })
        .filter(Boolean)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
};

const model = computed(() => {
    const decoratedItems = decorateMenuItems(menuItems);
    return [{ items: decoratedItems }];
});
</script>

<template>
    <AppSubMenu :model="model" />
</template>
