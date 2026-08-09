<script setup>
import { computed, ref } from 'vue';
import {
    resolveAppearanceToDark,
    setAppearance,
    useLayout
} from '@/layout/composables/layout';
import { AuthService } from '@/services';
import { useSessionStore } from '@/stores';

const { layoutState, closeSettingsDialog, layoutConfig } = useLayout();
const sessionStore = useSessionStore();

const activeSection = ref('general');

const appearanceOptions = computed(() => [
    {
        label: $t('layout.settings_dialog.appearance_system'),
        value: 'system'
    },
    {
        label: $t('layout.settings_dialog.appearance_dark'),
        value: 'dark'
    },
    {
        label: $t('layout.settings_dialog.appearance_light'),
        value: 'light'
    }
]);

const appearance = computed({
    get: () => layoutConfig.appearance,
    set: (value) => {
        setAppearance(value);
        persistAppearance(value);
    }
});

function persistAppearance(value) {
    AuthService.updateUiPreferences({
        dark_mode: resolveAppearanceToDark(value)
    })
        .then(() => {
            if (sessionStore.user) {
                sessionStore.user.dark_mode = resolveAppearanceToDark(value);
            }
        })
        .catch(() => {});
}
</script>

<template>
    <Dialog
        v-model:visible="layoutState.settingsDialogVisible"
        modal
        header="&nbsp;"
        dismissableMask
        class="settings-dialog"
        :draggable="false"
        :style="{ width: 'min(94vw, 42.5rem)' }"
    >
        <div class="settings-dialog__shell">

            <div class="settings-dialog__layout">
                <aside class="settings-dialog__sidebar">
                    <nav
                        class="layout-menu settings-dialog__nav"
                        :aria-label="$t('layout.settings_dialog.nav_label')"
                    >
                        <ul>
                            <li class="layout-root-menuitem">
                                <button
                                    type="button"
                                    class="sidebar-nav-link flex items-center gap-2"
                                    :class="{
                                        'active-route':
                                            activeSection === 'general'
                                    }"
                                >
                                    <i
                                        class="pi pi-sliders-h layout-menuitem-icon"
                                        aria-hidden="true"
                                    ></i>
                                    <span class="layout-menuitem-text">
                                        {{
                                            $t(
                                                'layout.settings_dialog.general'
                                            )
                                        }}
                                    </span>
                                </button>
                            </li>
                        </ul>
                    </nav>
                </aside>

                <section class="settings-dialog__panel">
                    <h2 class="settings-dialog__title">
                        {{ $t('layout.settings_dialog.general') }}
                    </h2>

                    <div class="settings-dialog__rows">
                        <div class="settings-dialog__row">
                            <span class="settings-dialog__row-label">
                                {{ $t('layout.settings_dialog.appearance') }}
                            </span>
                            <Select
                                v-model="appearance"
                                :options="appearanceOptions"
                                optionLabel="label"
                                optionValue="value"
                                class="settings-dialog__select"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </Dialog>
</template>
