<script setup>
import { computed, ref, watch } from 'vue';
import {
    resolveAppearanceToDark,
    setAppearance,
    useLayout
} from '@/layout/composables/layout';
import { AuthService } from '@/services';
import { useLanguageStore, useProfileStore, useSessionStore } from '@/stores';

const { layoutState, closeSettingsDialog, layoutConfig } = useLayout();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const languageStore = useLanguageStore();

const activeSection = ref('general');
const languageOptions = ref([]);
const loadingLanguages = ref(false);
const preferredLanguageUuid = ref(null);
const savingLanguage = ref(false);

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

const preferredLanguage = computed({
    get: () => preferredLanguageUuid.value,
    set: (value) => {
        if (value === preferredLanguageUuid.value || savingLanguage.value) {
            return;
        }

        preferredLanguageUuid.value = value;
        persistPreferredLanguage(value);
    }
});

function buildLanguageSelectOptions(activeList, selectedUuid, selectedLanguage) {
    const list = Array.isArray(activeList) ? [...activeList] : [];

    if (
        selectedUuid &&
        selectedLanguage &&
        !list.some((language) => language.uuid === selectedUuid)
    ) {
        list.push(selectedLanguage);
    }

    return list;
}

async function loadLanguageOptions() {
    const user = sessionStore.user;
    preferredLanguageUuid.value =
        user?.preferred_language_uuid ?? user?.preferred_language?.uuid ?? null;

    try {
        loadingLanguages.value = true;
        const active = await languageStore.getActiveLanguages();
        languageOptions.value = buildLanguageSelectOptions(
            active,
            preferredLanguageUuid.value,
            user?.preferred_language ?? user?.preferredLanguage ?? null
        );
    } finally {
        loadingLanguages.value = false;
    }
}

watch(
    () => layoutState.settingsDialogVisible,
    (visible) => {
        if (visible) {
            loadLanguageOptions();
        }
    }
);

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

function persistPreferredLanguage(value) {
    const userId = sessionStore.user?.uuid;
    if (!userId) {
        return;
    }

    const previousValue =
        sessionStore.user?.preferred_language_uuid ??
        sessionStore.user?.preferred_language?.uuid ??
        null;

    savingLanguage.value = true;

    profileStore
        .update(userId, { preferred_language_uuid: value }, { silent: true })
        .then(() => sessionStore.me())
        .catch(() => {
            preferredLanguageUuid.value = previousValue;
        })
        .finally(() => {
            savingLanguage.value = false;
        });
}
</script>

<template>
    <Dialog
        v-model:visible="layoutState.settingsDialogVisible"
        modal
        dismissableMask
        class="settings-dialog"
        :showHeader="false"
        :draggable="false"
        :style="{ width: 'min(94vw, 52rem)' }"
    >
        <div class="settings-dialog__frame">
            <Button
                type="button"
                icon="pi pi-times"
                rounded
                text
                severity="secondary"
                class="settings-dialog__close"
                :aria-label="$t('close')"
                @click="closeSettingsDialog"
            />

            <div class="settings-dialog__layout">
                <aside class="settings-dialog__sidebar">
                    <nav
                        class="settings-dialog__nav"
                        :aria-label="$t('layout.settings_dialog.nav_label')"
                    >
                        <button
                            type="button"
                            class="settings-dialog__nav-item"
                            :class="{
                                'settings-dialog__nav-item--active':
                                    activeSection === 'general'
                            }"
                        >
                            <i
                                class="pi pi-cog settings-dialog__nav-icon"
                                aria-hidden="true"
                            ></i>
                            <span>{{ $t('layout.settings_dialog.general') }}</span>
                        </button>
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

                        <div class="settings-dialog__row">
                            <span class="settings-dialog__row-label">
                                {{ $t('preferred_language') }}
                            </span>
                            <Select
                                v-model="preferredLanguage"
                                :options="languageOptions"
                                optionLabel="name"
                                optionValue="uuid"
                                :placeholder="$t('select')"
                                :loading="loadingLanguages || savingLanguage"
                                :disabled="loadingLanguages || savingLanguage"
                                showClear
                                filter
                                :filterFields="['name', 'locale', 'code']"
                                class="settings-dialog__select settings-dialog__select--language"
                            />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </Dialog>
</template>
