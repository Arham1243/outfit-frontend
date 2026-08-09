<script setup>
import { useLayout } from '@/layout/composables/layout';
import { calculateScrollbarWidth, getViewport } from '@primeuix/utils/dom';
import { nextTick, onBeforeMount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const {
    layoutConfig,
    layoutState,
    setActiveMenuItem,
    toggleMenu,
    isHorizontal,
    isSlim,
    isSlimPlus,
    isDesktop
} = useLayout();

const props = defineProps({
    item: {
        type: Object,
        default: () => ({})
    },
    index: {
        type: Number,
        default: 0
    },
    root: {
        type: Boolean,
        default: true
    },
    parentItemKey: {
        type: String,
        default: null
    }
});

const isActiveMenu = ref(false);
const itemKey = ref(null);
const subMenuRef = ref(null);
const menuItemRef = ref(null);

onBeforeMount(() => {
    itemKey.value = props.parentItemKey
        ? props.parentItemKey + '-' + props.index
        : String(props.index);

    const activeItem = layoutState.activeMenuItem;

    isActiveMenu.value =
        activeItem === itemKey.value || activeItem
            ? activeItem.startsWith(itemKey.value + '-')
            : false;
    handleRouteChange(route.path);
});

watch(
    () => isActiveMenu.value,
    () => {
        const rootIndex = props.root
            ? props.index
            : parseInt(`${props.parentItemKey}`[0], 10);
        const overlay = document.querySelectorAll('.layout-root-submenulist')[
            rootIndex
        ];
        const target = document.querySelectorAll('.layout-root-menuitem')[
            rootIndex
        ];

        if (
            (isSlim.value || isSlimPlus.value || isHorizontal.value) &&
            isDesktop
        ) {
            nextTick(() => {
                calculatePosition(overlay, target);
            });
        }
    }
);

watch(
    () => layoutState.activeMenuItem,
    (newVal) => {
        isActiveMenu.value =
            newVal === itemKey.value || newVal.startsWith(itemKey.value + '-');
    }
);

watch(
    () => layoutConfig.menuMode,
    () => {
        isActiveMenu.value = false;
    }
);

watch(
    () => layoutState.overlaySubmenuActive,
    (newValue) => {
        if (!newValue) {
            isActiveMenu.value = false;
        }
    }
);

watch(() => route.path, handleRouteChange);

watch(
    () => route.path,
    (newPath) => {
        if (
            !(isSlim.value || isSlimPlus.value || isHorizontal.value) &&
            props.item.to &&
            props.item.to === newPath
        ) {
            setActiveMenuItem(itemKey);
        } else if (isSlim.value || isSlimPlus.value || isHorizontal.value) {
            isActiveMenu.value = false;
        }
    }
);

async function itemClick(event, item) {
    if (item.disabled) {
        event.preventDefault();
        return;
    }

    if (
        (item.to || item.url) &&
        (layoutState.staticMenuMobileActive || layoutState.overlayMenuActive)
    ) {
        toggleMenu();
    }

    if (item.command) {
        item.command({ originalEvent: event, item: item });
    }

    if (item.items) {
        if (
            props.root &&
            isActiveMenu.value &&
            (isSlim.value || isSlimPlus.value || isHorizontal.value)
        ) {
            layoutState.overlaySubmenuActive = false;
            layoutState.menuHoverActive = false;

            return;
        }

        setActiveMenuItem(isActiveMenu.value ? props.parentItemKey : itemKey);

        if (
            props.root &&
            !isActiveMenu.value &&
            (isSlim.value || isSlimPlus.value || isHorizontal.value)
        ) {
            layoutState.overlaySubmenuActive = true;
            layoutState.menuHoverActive = true;
            isActiveMenu.value = true;

            removeAllTooltips();
        }
    } else {
        if (!isDesktop) {
            layoutState.staticMenuMobileActive =
                !layoutState.staticMenuMobileActive;
        }

        if (isSlim.value || isSlimPlus.value || isHorizontal.value) {
            layoutState.overlaySubmenuActive = false;
            layoutState.menuHoverActive = false;

            return;
        }

        setActiveMenuItem(itemKey);
    }
}

function handleRouteChange(newPath) {
    if (
        !(isSlim.value || isSlimPlus.value || isHorizontal.value) &&
        props.item.to &&
        props.item.to === newPath
    ) {
        setActiveMenuItem(itemKey);
    } else if (isSlim.value || isSlimPlus.value || isHorizontal.value) {
        isActiveMenu.value = false;
    }
}

function onMouseEnter() {
    if (
        props.root &&
        (isSlim.value || isSlimPlus.value || isHorizontal.value) &&
        isDesktop
    ) {
        if (!isActiveMenu.value && layoutState.menuHoverActive) {
            setActiveMenuItem(itemKey);
        }
    }
}

function removeAllTooltips() {
    const tooltips = document.querySelectorAll('.p-tooltip');
    tooltips.forEach((tooltip) => {
        tooltip.remove();
    });
}

function calculatePosition(overlay, target) {
    if (overlay) {
        const { left, top } = target.getBoundingClientRect();
        const { width: vWidth, height: vHeight } = getViewport();
        const [oWidth, oHeight] = [overlay.offsetWidth, overlay.offsetHeight];
        const scrollbarWidth = calculateScrollbarWidth();

        // reset
        overlay.style.top = overlay.style.left = '';

        if (isHorizontal.value) {
            const width = left + oWidth + scrollbarWidth;
            overlay.style.left =
                vWidth < width ? `${left - (width - vWidth)}px` : `${left}px`;
        } else if (isSlim.value || isSlimPlus.value) {
            const height = top + oHeight;
            overlay.style.top =
                vHeight < height ? `${top - (height - vHeight)}px` : `${top}px`;
        }
    }
}

function checkActiveRoute(item) {
    return route.path === item.to;
}
</script>

<template>
    <li
        ref="menuItemRef"
        :class="{
            'layout-root-menuitem': root,
            'active-menuitem': isActiveMenu
        }"
    >
        <a
            v-if="(!item.to || item.items) && item.visible !== false"
            :href="item.url"
            @click="itemClick($event, item, index)"
            :class="[item.class, 'sidebar-nav-link']"
            :target="item.target"
            tabindex="0"
            @mouseenter="onMouseEnter"
            v-tooltip.hover="
                isSlim && root && !isActiveMenu
                      ? $t(item.label)
                      : null
            "
        >
            <i :class="item.icon" class="layout-menuitem-icon"></i>
            <span class="layout-menuitem-text">{{
                item.label ? $t(item.label) : ''
            }}</span>
            <i
                class="pi pi-fw pi-angle-down layout-submenu-toggler"
                v-if="item.items"
            ></i>
        </a>
        <router-link
            v-if="
                item.to && !item.items && item.visible !== false
            "
            @click="itemClick($event, item, index)"
            :class="[
                item.class,
                'sidebar-nav-link',
                { 'active-route': checkActiveRoute(item) }
            ]"
            tabindex="0"
            :to="item.to"
            @mouseenter="onMouseEnter"
            v-tooltip.hover="
                isSlim && root && !isActiveMenu
                      ? item.label
                          ? $t(item.label)
                          : null
                      : null
            "
        >
            <i :class="item.icon" class="layout-menuitem-icon"></i>
            <span class="layout-menuitem-text">{{
                item.label ? $t(item.label) : ''
            }}</span>
            <i
                class="pi pi-fw pi-angle-down layout-submenu-toggler"
                v-if="item.items"
            ></i>
        </router-link>

        <ul
            ref="subMenuRef"
            :class="{ 'layout-root-submenulist': root }"
            v-if="item.items && item.visible !== false"
        >
            <AppMenuItem
                v-for="(child, i) in item.items"
                :key="child"
                :index="i"
                :item="child"
                :parentItemKey="itemKey"
                :root="false"
            ></AppMenuItem>
        </ul>
    </li>
</template>

<style scoped>
.layout-submenu-toggler {
    margin-left: auto;
}

[dir='rtl'] .layout-submenu-toggler {
    margin-left: 0;
    margin-right: auto;
}

[dir='rtl'] .layout-submenu-toggler.pi-angle-down {
    margin-left: initial;
}
</style>
