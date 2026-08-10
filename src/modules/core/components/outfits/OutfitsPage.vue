<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { useOutfitStore } from '@/modules/core/stores';
import { OutfitService } from '@/modules/core/services';
import { OUTFIT_FACE_IMAGE } from '@/config';
import { useGlobalStore, useProfileStore, useSessionStore } from '@/stores';
import { useHelpers } from '@/composables/useHelpers';
import { getValidationErrorMessage } from '@/utils/apiErrors';
import { formatMissingWardrobeGroups } from '@/config/outfitRequirements';
import { formatWardrobeTypeLabel } from '@/config/wardrobeTypes';
import {
    cmToFeetInchesInput,
    feetInchesInputToCm,
    parseFeetInchesInput
} from '@/utils/heightConversion';

const { filterFileFields } = useHelpers();

const GALLERY_LIMIT = 50;
const GALLERY_POLL_INTERVAL_MS = 3000;
const GALLERY_POLL_JOB_ESTIMATE_MS = 120000;
const GALLERY_POLL_BUFFER_ATTEMPTS = 10;

const outfitStore = useOutfitStore();
const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();
const router = useRouter();

const savingProfile = ref(false);
const loadingCounts = ref(false);
const loadingGallery = ref(false);
const showGallery = ref(false);
const showSettingsDialog = ref(false);
const typeCounts = ref({});
const wardrobeTotal = ref(0);
const combinationStats = ref(null);
const loadingCombinationStats = ref(false);
const galleryItems = ref([]);
const pendingBatchIds = ref(new Set());
const showWardrobeDialog = ref(false);
const selectedOutfit = ref(null);
let galleryPollTimer = null;
let galleryPollAttempts = 0;

const formData = ref({
    gender: null,
    height: null,
    face_image: null,
    face_mode: 'ai_model'
});

const heightFtInput = ref('');

const settingsInitialData = ref({
    gender: null,
    height: null,
    height_ft: '',
    face_image: null,
    face_mode: 'ai_model'
});

const genderOptions = [
    { name: $t('male'), code: 'male' },
    { name: $t('female'), code: 'female' }
];

const faceModeOptions = [
    { name: $t('outfit_face_mode_ai_model'), code: 'ai_model' },
    { name: $t('outfit_face_mode_user_face'), code: 'user_face' }
];

const requiresFaceImage = computed(() => formData.value.face_mode === 'user_face');

const settingsDialogFormData = computed(() => ({
    ...formData.value,
    height_ft: heightFtInput.value
}));

const sortedTypeCounts = computed(() => {
    return Object.entries(typeCounts.value)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b));
});

const generateButtonLabel = computed(() =>
    galleryItems.value.length ? $t('generate_more') : $t('generate')
);

const showCombinationStats = computed(() => {
    const stats = combinationStats.value;

    return Boolean(stats?.wardrobe_ready && stats.total_possible > 0);
});

const combinationStatsMessage = computed(() => {
    const stats = combinationStats.value;

    if (!stats?.wardrobe_ready || stats.total_possible <= 0) {
        return '';
    }

    if (stats.all_exhausted) {
        return $t('outfit_combinations_exhausted', {
            total: stats.total_possible
        });
    }

    return $t('outfit_combinations_available', {
        total: stats.total_possible
    });
});

const combinationCountsMessage = computed(() => {
    const stats = combinationStats.value;

    if (!stats?.wardrobe_ready || stats.total_possible <= 0) {
        return '';
    }

    return $t('outfit_combinations_created_remaining', {
        generated: stats.generated_count,
        remaining: stats.remaining,
        total: stats.total_possible
    });
});

const isGenerateDisabled = computed(() => {
    if (loadingGallery.value) {
        return true;
    }

    const stats = combinationStats.value;

    if (!stats?.wardrobe_ready) {
        return false;
    }

    return stats.all_exhausted || stats.remaining === 0;
});

const heightFieldError = computed(() => {
    const messages = globalStore.errors?.height;
    if (!messages) return '';
    return Array.isArray(messages) ? messages[0] : messages;
});

const genderFieldError = computed(() => {
    const messages = globalStore.errors?.gender;
    if (!messages) return '';
    return Array.isArray(messages) ? messages[0] : messages;
});

const faceFieldError = computed(() => {
    const messages = globalStore.errors?.face_image;
    if (!messages) return '';
    return Array.isArray(messages) ? messages[0] : messages;
});

const heightCmPreview = computed(() => feetInchesInputToCm(heightFtInput.value));

const heightCmPreviewLabel = computed(() => {
    if (heightCmPreview.value === null) {
        return '';
    }

    return $t('height_cm_equivalent', { cm: heightCmPreview.value });
});

const faceDimensionHint = computed(() =>
    $t('wardrobe_upload_recommended_dimensions', {
        width: OUTFIT_FACE_IMAGE.recommendedWidth,
        height: OUTFIT_FACE_IMAGE.recommendedHeight,
        ratio: OUTFIT_FACE_IMAGE.aspectRatioLabel
    })
);

const normalizeHeightFromFeet = (value) => {
    const cm = feetInchesInputToCm(value);

    if (cm === null) {
        return null;
    }

    if (cm < 50 || cm > 300) {
        return null;
    }

    return cm;
};

onBeforeMount(async () => {
    await Promise.all([
        loadProfile(),
        loadTypeCounts(),
        loadCombinationStats(),
        loadGallery()
    ]);
    await registerPendingBatchesForPolling();
    startGalleryPolling();
});

onBeforeUnmount(() => {
    stopGalleryPolling();
});

const formatType = (type) => {
    if (!type) return '';
    if (type === 'uncategorized') return $t('uncategorized');
    return String(type)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
};

const formatTypeCount = (type, count) => {
    return $t('wardrobe_type_count', {
        count,
        type: formatType(type)
    });
};

const goToWardrobe = () => {
    router.push({ name: 'Wardrobe' });
};

const loadProfile = async () => {
    const user = sessionStore.user;
    if (!user?.uuid) return;

    profileStore.getItem(user.uuid);
    const profile = profileStore.currentItem ?? user;
    formData.value.gender = profile.gender ?? null;
    formData.value.height = profile.height ?? null;
    formData.value.face_image = profile.face_image ?? null;
    const faceMode = profile.face_mode ?? 'ai_model';
    formData.value.face_mode =
        faceMode === 'user_body_ai_face' ? 'user_face' : faceMode;
    heightFtInput.value = cmToFeetInchesInput(profile.height);
};

const loadTypeCounts = async () => {
    try {
        loadingCounts.value = true;
        const res = await outfitStore.getTypeCounts();
        typeCounts.value = res.data ?? {};
        wardrobeTotal.value = res.total ?? 0;
    } finally {
        loadingCounts.value = false;
    }
};

const applyCombinationStats = (stats) => {
    if (!stats || stats.total_possible === undefined) {
        return;
    }

    combinationStats.value = {
        total_possible: stats.total_possible,
        generated_count: stats.generated_count,
        remaining: stats.remaining,
        per_batch_limit: stats.per_batch_limit,
        all_exhausted: stats.all_exhausted,
        wardrobe_ready: stats.wardrobe_ready ?? true
    };
};

const loadCombinationStats = async () => {
    try {
        loadingCombinationStats.value = true;
        const res = await outfitStore.getCombinationStats();
        applyCombinationStats(res.data);
    } finally {
        loadingCombinationStats.value = false;
    }
};

const mapGalleryItems = (items) =>
    (items ?? []).map((item, index) => ({
        ...item,
        _key: item.uuid ?? `outfit-${index}`
    }));

const registerBatchForPolling = (batchId) => {
    if (!batchId) {
        return;
    }

    pendingBatchIds.value = new Set([...pendingBatchIds.value, batchId]);
};

const registerPendingBatchesForPolling = async () => {
    if (!hasPendingGalleryItems()) {
        return;
    }

    try {
        const res = await OutfitService.getLatestBatch();
        registerBatchForPolling(res.data?.meta?.batch_id);
    } catch {
        // Ignore; list polling below can still refresh pending tiles.
    }
};

const mergeGalleryItems = (incoming) => {
    if (!incoming?.length) {
        return;
    }

    const byUuid = new Map(galleryItems.value.map((item) => [item.uuid, item]));

    for (const item of incoming) {
        const existing = byUuid.get(item.uuid);
        byUuid.set(item.uuid, {
            ...(existing ?? {}),
            ...item,
            _key: item.uuid ?? existing?._key ?? item._key
        });
    }

    const incomingUuids = new Set(incoming.map((item) => item.uuid));
    const orderedIncoming = incoming.map((item) => byUuid.get(item.uuid));
    const rest = galleryItems.value.filter((item) => !incomingUuids.has(item.uuid));

    galleryItems.value = [...orderedIncoming, ...rest];
    showGallery.value = galleryItems.value.length > 0;
};

const loadGallerySilently = async () => {
    const res = await OutfitService.list({ page: 1, limit: GALLERY_LIMIT });
    const payload = res.data;

    if (!payload.data?.length) {
        return false;
    }

    showGallery.value = true;
    galleryItems.value = mapGalleryItems(payload.data);

    return true;
};

const loadGallery = async () => {
    const res = await outfitStore.list({ page: 1, limit: GALLERY_LIMIT });
    if (!res.data?.length) {
        return false;
    }

    showGallery.value = true;
    galleryItems.value = mapGalleryItems(res.data);

    return true;
};

const hasPendingGalleryItems = () =>
    galleryItems.value.some((item) => isOutfitPending(item));

const getGalleryPollMaxAttempts = () => {
    const pendingCount = Math.max(
        1,
        galleryItems.value.filter((item) => isOutfitPending(item)).length,
        pendingBatchIds.value.size
    );

    return (
        Math.ceil(
            (pendingCount * GALLERY_POLL_JOB_ESTIMATE_MS) / GALLERY_POLL_INTERVAL_MS
        ) + GALLERY_POLL_BUFFER_ATTEMPTS
    );
};

const refreshPendingOutfits = async () => {
    if (pendingBatchIds.value.size === 0 && hasPendingGalleryItems()) {
        await registerPendingBatchesForPolling();
    }

    for (const batchId of [...pendingBatchIds.value]) {
        const res = await OutfitService.getBatch(batchId);
        const payload = res.data;

        mergeGalleryItems(mapGalleryItems(payload.data));

        if ((payload.meta?.pending ?? 0) === 0) {
            const next = new Set(pendingBatchIds.value);
            next.delete(batchId);
            pendingBatchIds.value = next;
        }
    }

    if (hasPendingGalleryItems()) {
        await loadGallerySilently();
    }
};

const stopGalleryPolling = () => {
    if (galleryPollTimer) {
        clearInterval(galleryPollTimer);
        galleryPollTimer = null;
    }
    galleryPollAttempts = 0;
};

const startGalleryPolling = () => {
    stopGalleryPolling();

    if (!hasPendingGalleryItems()) {
        return;
    }

    const poll = async () => {
        galleryPollAttempts += 1;

        try {
            await refreshPendingOutfits();
        } catch {
            stopGalleryPolling();
            return;
        }

        if (!hasPendingGalleryItems()) {
            stopGalleryPolling();
            try {
                const res = await OutfitService.getCombinationStats();
                applyCombinationStats(res.data?.data);
            } catch {
                // Non-blocking refresh after the gallery finishes updating.
            }
            return;
        }

        if (galleryPollAttempts >= getGalleryPollMaxAttempts()) {
            stopGalleryPolling();
        }
    };

    galleryPollAttempts = 0;
    poll();
    galleryPollTimer = setInterval(poll, GALLERY_POLL_INTERVAL_MS);
};

const openSettingsDialog = async () => {
    await loadProfile();
    settingsInitialData.value = {
        gender: formData.value.gender,
        height: formData.value.height,
        height_ft: heightFtInput.value,
        face_image: formData.value.face_image,
        face_mode: formData.value.face_mode
    };
    showSettingsDialog.value = true;
};

const onSettingsCancel = () => {
    formData.value = {
        gender: settingsInitialData.value.gender,
        height: settingsInitialData.value.height,
        face_image: settingsInitialData.value.face_image,
        face_mode: settingsInitialData.value.face_mode
    };
    heightFtInput.value = settingsInitialData.value.height_ft
        || cmToFeetInchesInput(settingsInitialData.value.height);
    globalStore.clearErrors();
};

const onFaceFileSelect = (event) => {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.face_image = e.target.result;
    };
    reader.readAsDataURL(file);
};

const saveProfile = async () => {
    const user = sessionStore.user;
    if (!user?.uuid) return;

    if (!parseFeetInchesInput(heightFtInput.value)) {
        globalStore.showError(
            $t('validation_error'),
            $t('height_ft_invalid')
        );
        return;
    }

    try {
        savingProfile.value = true;
        globalStore.clearErrors();
        const height = normalizeHeightFromFeet(heightFtInput.value);

        if (height === null) {
            globalStore.showError(
                $t('validation_error'),
                $t('height_ft_out_of_range')
            );
            return;
        }

        if (requiresFaceImage.value && !formData.value.face_image) {
            globalStore.showError(
                $t('validation_error'),
                $t('outfit_face_image_required')
            );
            return;
        }

        formData.value.height = height;
        const payload = filterFileFields(
            {
                gender: formData.value.gender,
                height,
                face_mode: formData.value.face_mode,
                face_image: formData.value.face_image
            },
            ['face_image']
        );
        await profileStore.update(user.uuid, payload);
        await sessionStore.me();
        await loadProfile();
        heightFtInput.value = cmToFeetInchesInput(formData.value.height);
        settingsInitialData.value = {
            gender: formData.value.gender,
            height: formData.value.height,
            height_ft: heightFtInput.value,
            face_image: formData.value.face_image,
            face_mode: formData.value.face_mode
        };
        showSettingsDialog.value = false;
    } catch (error) {
        globalStore.showError(
            $t('validation_error'),
            getValidationErrorMessage(error, $t('something_went_wrong'))
        );
    } finally {
        savingProfile.value = false;
    }
};

const isOutfitPending = (item) =>
    item?.status === 'pending' || item?.status === 'processing';

const isOutfitFailed = (item) => item?.status === 'failed';

const openWardrobeDialog = (item, event) => {
    event?.stopPropagation();
    selectedOutfit.value = item;
    showWardrobeDialog.value = true;
};

const openSettingsForMissingProfile = async (message) => {
    globalStore.showError($t('validation_error'), message);
    await openSettingsDialog();
};

const createOutfits = async () => {
    try {
        loadingGallery.value = true;
        showGallery.value = true;
        const res = await outfitStore.generate();
        applyCombinationStats(res.meta);
        registerBatchForPolling(res.meta?.batch_id);

        if (res.data?.length) {
            mergeGalleryItems(mapGalleryItems(res.data));
        } else {
            await loadGallerySilently();
        }

        startGalleryPolling();
    } catch (error) {
        const responseData = error?.response?.data;
        if (error?.response?.status === 422) {
            if (responseData?.meta) {
                applyCombinationStats(responseData.meta);
            }

            if (responseData?.meta?.requires_settings) {
                await openSettingsForMissingProfile(
                    getValidationErrorMessage(
                        error,
                        $t('outfit_complete_settings_first')
                    )
                );
                return;
            }

            if (responseData?.meta?.missing_wardrobe_groups?.length) {
                globalStore.showError(
                    $t('validation_error'),
                    $t('outfit_missing_wardrobe_detail', {
                        groups: formatMissingWardrobeGroups(
                            responseData.meta.missing_wardrobe_groups,
                            $t
                        )
                    })
                );
                return;
            }

            if (responseData?.meta?.all_combinations_exhausted) {
                globalStore.showError(
                    $t('validation_error'),
                    getValidationErrorMessage(
                        error,
                        $t('outfit_no_combinations_available')
                    )
                );
                return;
            }

            globalStore.showError(
                $t('validation_error'),
                getValidationErrorMessage(error, $t('outfit_generate_failed'))
            );
            return;
        }

        throw error;
    } finally {
        loadingGallery.value = false;
    }
};
</script>

<template>
    <section class="outfits-page-shell">
        <section class="outfits-page">
        <header class="outfits-hero">
            <h1 class="outfits-hero__title">{{ $t('create_outfits') }}</h1>

            <div class="outfits-hero__summary">
                <div class="outfits-hero__search-row">
                    <div
                        class="outfits-hero__chips-field"
                        :class="{
                            'outfits-hero__chips-field--disabled': loadingCounts
                        }"
                        :aria-disabled="loadingCounts"
                    >
                        <template v-if="!loadingCounts && sortedTypeCounts.length">
                            <Tag
                                v-for="[type, count] in sortedTypeCounts"
                                :key="type"
                                :value="formatTypeCount(type, count)"
                                class="outfits-hero__chip"
                                rounded
                                role="link"
                                tabindex="0"
                                @click="goToWardrobe"
                                @keydown.enter="goToWardrobe"
                                @keydown.space.prevent="goToWardrobe"
                            />
                        </template>
                        <span
                            v-else-if="!loadingCounts"
                            class="outfits-hero__summary-empty"
                        >
                            {{ $t('no_wardrobe_images_found') }}
                        </span>

                        <Button
                            rounded
                            icon="pi pi-sliders-v"
                            variant="text"
                            class="outfits-hero__settings"
                            :aria-label="$t('outfit_settings')"
                            @click="openSettingsDialog"
                        />
                    </div>
                </div>
            </div>

            <div
                v-if="showCombinationStats"
                class="outfits-hero__combination-stats"
                :class="{
                    'outfits-hero__combination-stats--exhausted':
                        combinationStats?.all_exhausted
                }"
            >
                <p class="outfits-hero__combination-stats-summary">
                    {{ combinationStatsMessage }}
                </p>
                <p class="outfits-hero__combination-stats-counts">
                    {{ combinationCountsMessage }}
                </p>
            </div>

            <Button
                v-if="$ability.can('core.outfits.create')"
                class="outfits-hero__create"
                :label="generateButtonLabel"
                icon="pi pi-sparkles"
                :loading="loadingGallery"
                :disabled="isGenerateDisabled"
                @click="createOutfits"
            />
        </header>

        <section v-if="showGallery" class="outfits-gallery-section">
            <Loader v-if="loadingGallery && !galleryItems.length" />

            <div v-else-if="galleryItems.length" class="outfits-gallery">
                <article
                    v-for="item in galleryItems"
                    :key="`${item.uuid}-${item.status}-${item.image_url ?? ''}`"
                    class="outfits-gallery__tile"
                    :class="{
                        'outfits-gallery__tile--pending': isOutfitPending(item),
                        'outfits-gallery__tile--failed': isOutfitFailed(item)
                    }"
                >
                    <div class="outfits-gallery__outfit">
                        <img
                            v-if="item.image_url"
                            :src="item.image_url"
                            :alt="$t('outfit_preview')"
                            class="outfits-gallery__img"
                            role="button"
                            tabindex="0"
                            @click="openWardrobeDialog(item, $event)"
                            @keydown.enter="openWardrobeDialog(item, $event)"
                            @keydown.space.prevent="openWardrobeDialog(item, $event)"
                        />
                        <div
                            v-else-if="isOutfitPending(item)"
                            class="outfits-gallery__placeholder"
                        >
                            <Loader compact />
                        </div>
                        <div
                            v-else-if="isOutfitFailed(item)"
                            class="outfits-gallery__placeholder outfits-gallery__placeholder--failed"
                        >
                            <i class="pi pi-exclamation-triangle" aria-hidden="true" />
                            <span>{{ $t('outfit_generation_failed') }}</span>
                        </div>
                    </div>
                </article>
            </div>
        </section>
        </section>
    </section>

    <Dialog
        v-model:visible="showWardrobeDialog"
        modal
        dismissable-mask
        :header="$t('outfit_preview')"
        class="outfits-wardrobe-dialog"
        :style="{ width: 'auto', maxWidth: '98vw' }"
        @hide="selectedOutfit = null"
    >
        <div v-if="selectedOutfit" class="outfits-wardrobe-dialog__body">
            <div class="outfits-wardrobe-dialog__outfit">
                <img
                    v-if="selectedOutfit.image_url"
                    :src="selectedOutfit.image_url"
                    :alt="$t('outfit_preview')"
                    class="outfits-wardrobe-dialog__outfit-img"
                />
                <div
                    v-else-if="isOutfitPending(selectedOutfit)"
                    class="outfits-wardrobe-dialog__outfit-placeholder"
                >
                    <Loader compact />
                </div>
                <div
                    v-else-if="isOutfitFailed(selectedOutfit)"
                    class="outfits-wardrobe-dialog__outfit-placeholder outfits-wardrobe-dialog__outfit-placeholder--failed"
                >
                    <i class="pi pi-exclamation-triangle" aria-hidden="true" />
                    <span>{{ $t('outfit_generation_failed') }}</span>
                </div>
            </div>

            <aside class="outfits-wardrobe-dialog__items">
                <p class="outfits-wardrobe-dialog__items-label">
                    {{ $t('outfit_items_used') }}
                </p>
                <div class="outfits-wardrobe-dialog__grid">
                    <article
                        v-for="wardrobe in selectedOutfit.wardrobe_items"
                        :key="wardrobe.uuid"
                        class="outfits-wardrobe-dialog__item"
                    >
                        <div class="outfits-wardrobe-dialog__item-media">
                            <Image
                                v-if="wardrobe.image_url"
                                :src="wardrobe.image_url"
                                :alt="formatWardrobeTypeLabel(wardrobe.type)"
                                preview
                                imageClass="outfits-wardrobe-dialog__item-img"
                            >
                                <template #preview="slotProps">
                                    <img
                                        :src="wardrobe.image_url"
                                        :alt="formatWardrobeTypeLabel(wardrobe.type)"
                                        :class="[
                                            slotProps.class,
                                            'outfits-wardrobe-dialog__item-preview'
                                        ]"
                                        :style="slotProps.style"
                                        @click="slotProps.previewCallback"
                                    />
                                </template>
                            </Image>
                            <div
                                v-else
                                class="outfits-wardrobe-dialog__item-img outfits-wardrobe-dialog__item-img--empty"
                            >
                                <i class="pi pi-image" aria-hidden="true" />
                            </div>
                        </div>
                        <span class="outfits-wardrobe-dialog__item-label">
                            {{ formatWardrobeTypeLabel(wardrobe.type) }}
                        </span>
                    </article>
                </div>
            </aside>
        </div>
    </Dialog>

    <BaseDialog
        v-model:visible="showSettingsDialog"
        :header="$t('outfit_settings')"
        :busy="savingProfile"
        :isEditMode="true"
        :formData="settingsDialogFormData"
        :initialData="settingsInitialData"
        :excludeDirtyKeys="['height']"
        :confirmLabel="$t('save')"
        @confirm="saveProfile"
        @cancel="onSettingsCancel"
    >
        <div class="col-span-12 sm:col-span-6">
            <label class="outfits-settings__label" for="outfit-gender">
                {{ $t('gender') }}
            </label>
            <InputField
                id="outfit-gender"
                v-model="formData.gender"
                class="w-full"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="genderOptions"
                :placeholder="$t('select')"
                :disabled="savingProfile"
                :invalid="!!genderFieldError"
            />
            <small v-if="genderFieldError" class="outfits-settings__error">
                {{ genderFieldError }}
            </small>
        </div>

        <div class="col-span-12 sm:col-span-6">
            <label class="outfits-settings__label" for="outfit-height">
                {{ $t('height') }}
            </label>
            <div
                class="outfits-settings__height-input"
                :class="{ 'outfits-settings__height-input--invalid': !!heightFieldError }"
            >
                <input
                    id="outfit-height"
                    v-model="heightFtInput"
                    type="text"
                    inputmode="decimal"
                    placeholder="5.8"
                    class="outfits-settings__height-value"
                    :disabled="savingProfile"
                    :aria-invalid="!!heightFieldError"
                />
                <span class="outfits-settings__height-unit">{{ $t('ft') }}</span>
            </div>
            <small
                v-if="heightCmPreviewLabel"
                class="outfits-settings__height-hint"
            >
                {{ heightCmPreviewLabel }}
            </small>
            <small v-if="heightFieldError" class="outfits-settings__error">
                {{ heightFieldError }}
            </small>
        </div>

        <div class="col-span-12">
            <label class="outfits-settings__label" for="outfit-face-mode">
                {{ $t('outfit_face_mode') }}
            </label>
            <InputField
                id="outfit-face-mode"
                v-model="formData.face_mode"
                class="w-full"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="faceModeOptions"
                :placeholder="$t('select')"
                :disabled="savingProfile"
            />
            <p class="outfits-settings__face-hint">
                {{ $t('outfit_face_mode_hint') }}
            </p>
        </div>

        <div v-if="requiresFaceImage" class="col-span-12">
            <label class="outfits-settings__label">
                {{ $t('outfit_face_image') }}
            </label>
            <p class="outfits-settings__face-hint">
                {{ $t('outfit_face_image_hint') }}
                {{ faceDimensionHint }}
            </p>

            <div class="outfits-settings__face-upload-block">
                <div class="outfits-settings__face-preview">
                <img
                    v-if="formData.face_image"
                    :src="formData.face_image"
                    :alt="$t('outfit_face_image')"
                    class="outfits-settings__face-img"
                />
                <img
                    v-else
                    :src="PlaceholderImage"
                    :alt="$t('outfit_face_image')"
                    class="outfits-settings__face-img outfits-settings__face-img--placeholder"
                />
            </div>

            <FileUpload
                mode="basic"
                customUpload
                auto
                :chooseLabel="$t('upload')"
                chooseIcon="pi pi-upload"
                :maxFileSize="OUTFIT_FACE_IMAGE.maxFileSizeKb * 1024"
                accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                class="outfits-settings__face-upload"
                :disabled="savingProfile"
                @select="onFaceFileSelect"
            />
            </div>

            <small v-if="faceFieldError" class="outfits-settings__error">
                {{ faceFieldError }}
            </small>
        </div>
    </BaseDialog>
</template>

<style scoped>
.outfits-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem 0 0.5rem;
    width: 100%;
}

.outfits-hero__summary {
    width: 100%;
    margin-bottom: 1.5rem;
}

.outfits-hero__search-row {
    width: 100%;
}

.outfits-hero__settings {
    position: absolute !important;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    flex-shrink: 0;
    width: var(--outfits-settings-btn-width);
    height: var(--outfits-settings-btn-width);
    pointer-events: auto;
}

.outfits-hero__chips-field {
    --outfits-settings-btn-width: 2.5rem;
    position: relative;
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 0;
    min-height: 3.25rem;
    padding: 0.625rem var(--outfits-settings-btn-width) 0.625rem 1rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 9999px;
    background: var(--p-content-background, #fff);
    text-align: center;
}

.outfits-hero__chips-field--disabled {
    background: var(
        --p-form-field-disabled-background,
        var(--p-surface-100, #f1f5f9)
    );
    border-color: var(--p-content-border-color, #e2e8f0);
    color: var(--p-text-muted-color, #94a3b8);
    pointer-events: none;
    cursor: not-allowed;
}

.outfits-hero__chip {
    cursor: pointer;
}

.outfits-hero__chip:focus-visible {
    outline: 2px solid var(--p-primary-color, #1e3a5f);
    outline-offset: 2px;
}

.outfits-hero__title {
    margin: 0 0 1.5rem;
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
}

.outfits-hero__summary-empty {
    color: var(--p-text-muted-color);
    font-size: 0.875rem;
    padding: 0.125rem 0.25rem;
}

.outfits-hero__combination-stats {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0 1.25rem;
    max-width: 36rem;
}

.outfits-hero__combination-stats-summary,
.outfits-hero__combination-stats-counts {
    margin: 0;
    text-align: center;
    line-height: 1.5;
}

.outfits-hero__combination-stats-summary {
    font-size: 0.9375rem;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-hero__combination-stats-counts {
    font-size: 1rem;
    font-weight: 600;
    color: var(--p-text-color, #334155);
}

.outfits-hero__combination-stats--exhausted
    .outfits-hero__combination-stats-summary {
    color: var(--p-text-color, #334155);
}

.outfits-settings__height-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--p-content-background, #fff);
}

.outfits-settings__height-input--invalid {
    border-color: var(--p-red-500, #ef4444);
}

.outfits-settings__height-value {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--p-text-color);
    appearance: textfield;
    -moz-appearance: textfield;
}

.outfits-settings__height-value::-webkit-outer-spin-button,
.outfits-settings__height-value::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

.outfits-settings__height-value:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.outfits-settings__height-unit {
    flex-shrink: 0;
    font-size: 0.9375rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-settings__height-hint {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-settings__error {
    display: block;
    margin-top: 0.35rem;
    color: var(--p-red-500, #ef4444);
    font-size: 0.8125rem;
}

.outfits-settings__label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9375rem;
    color: var(--p-text-color);
}

.outfits-settings__switch-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.outfits-settings__switch-row .outfits-settings__label {
    margin-bottom: 0;
}

.outfits-settings__face-hint {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-settings__face-upload-block {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: fit-content;
}

.outfits-settings__face-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5.5rem;
    aspect-ratio: 1;
    margin-bottom: 0.75rem;
    border: 1px dashed var(--p-content-border-color, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--p-surface-50, #f8fafc);
    overflow: hidden;
}

.outfits-settings__face-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
}

.outfits-settings__face-img--placeholder {
    object-fit: contain;
    padding: 0.5rem;
}

.outfits-settings__face-upload {
    width: 5.5rem;
}

.outfits-gallery-section {
    width: 100%;
}

.outfits-gallery {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.35rem;
    align-items: start;
}

.outfits-gallery__tile {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 0.35rem;
    background: var(--p-surface-100, #f1f5f9);
}

.outfits-gallery__outfit {
    position: relative;
    width: 100%;
    height: 100%;
}

.outfits-gallery__tile :deep(.outfits-gallery__img),
.outfits-gallery__img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: top center;
    cursor: pointer;
}

.outfits-gallery__tile--pending,
.outfits-gallery__tile--failed {
    background: var(--p-surface-100, #f1f5f9);
}

.outfits-gallery__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    height: 100%;
    padding: 0.75rem;
    color: var(--p-text-muted-color, #64748b);
    font-size: 0.75rem;
    text-align: center;
}

.outfits-gallery__placeholder--failed {
    color: var(--p-red-500, #ef4444);
}

.outfits-wardrobe-dialog__body {
    display: flex;
    align-items: stretch;
    gap: 0.5rem;
    width: fit-content;
    max-width: 100%;
}

.outfits-wardrobe-dialog__outfit {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    justify-content: flex-start;
    width: fit-content;
    max-width: min(34rem, 52vw);
    min-height: 0;
    padding: 0.5rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.75rem;
    background: var(--p-surface-0, #fff);
}

.outfits-wardrobe-dialog__outfit-img {
    display: block;
    width: auto;
    max-width: min(33rem, 50vw);
    height: min(78vh, 44rem);
    object-fit: contain;
    object-position: top left;
}

.outfits-wardrobe-dialog__outfit-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 16rem;
    color: var(--p-text-muted-color, #64748b);
    text-align: center;
}

.outfits-wardrobe-dialog__outfit-placeholder--failed {
    color: var(--p-red-500, #ef4444);
}

.outfits-wardrobe-dialog__items {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    width: 24rem;
    max-width: 34vw;
    min-width: 18rem;
    padding: 0.85rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.75rem;
    background: var(--p-surface-50, #f8fafc);
}

.outfits-wardrobe-dialog__items-label {
    flex: 0 0 auto;
    margin: 0 0 0.6rem;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-wardrobe-dialog__grid {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.65rem;
    min-height: 0;
}

.outfits-wardrobe-dialog__item {
    display: flex;
    flex: 1 1 0;
    flex-direction: row;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    min-height: 0;
    padding: 0.65rem;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.625rem;
    background: var(--p-surface-0, #fff);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.outfits-wardrobe-dialog__item-media {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    width: auto;
    min-width: 0;
    height: 100%;
    min-height: 6.5rem;
    padding: 0.4rem;
    overflow: hidden;
    border: 1px solid var(--p-content-border-color, #e2e8f0);
    border-radius: 0.5rem;
    background: var(--p-surface-50, #f8fafc);
}

.outfits-wardrobe-dialog__item :deep(.p-image) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.outfits-wardrobe-dialog__item :deep(.outfits-wardrobe-dialog__item-img),
.outfits-wardrobe-dialog__item :deep(img:not(.outfits-wardrobe-dialog__item-preview)) {
    width: 100%;
    height: 100%;
    max-height: none;
    object-fit: contain;
    cursor: zoom-in;
}

.outfits-wardrobe-dialog__item-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.outfits-wardrobe-dialog__item-img--empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--p-text-muted-color, #64748b);
    font-size: 1.125rem;
}

.outfits-wardrobe-dialog__item-label {
    flex: 0 0 auto;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.2;
    color: var(--p-text-color);
    white-space: nowrap;
}

@media (max-width: 768px) {
    .outfits-gallery {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .outfits-wardrobe-dialog__body {
        flex-direction: column;
        width: 100%;
    }

    .outfits-wardrobe-dialog__items {
        width: 100%;
        max-width: 100%;
    }

    .outfits-wardrobe-dialog__grid {
        flex: none;
    }

    .outfits-wardrobe-dialog__item {
        flex: none;
    }

    .outfits-wardrobe-dialog__item-media {
        min-height: 5.5rem;
    }

    .outfits-wardrobe-dialog__outfit {
        max-width: 100%;
    }

    .outfits-wardrobe-dialog__outfit-img {
        max-width: 100%;
        height: min(60vh, 32rem);
    }
}

@media (max-width: 480px) {
    .outfits-gallery {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
