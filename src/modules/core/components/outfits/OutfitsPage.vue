<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useOutfitStore } from '@/modules/core/stores';
import { OutfitService } from '@/modules/core/services';
import { useGlobalStore, useProfileStore, useSessionStore } from '@/stores';
import { useHelpers } from '@/composables/useHelpers';
import { getValidationErrorMessage } from '@/utils/apiErrors';
import { formatMissingWardrobeGroups } from '@/config/outfitRequirements';
import {
    cmToFeetInchesInput,
    feetInchesInputToCm,
    parseFeetInchesInput
} from '@/utils/heightConversion';
import { PaginationOptions } from '@/config';
import OutfitsHeader from './OutfitsHeader.vue';
import OutfitsGenerationSettings from './OutfitsGenerationSettings.vue';
import OutfitsCapacityCard from './OutfitsCapacityCard.vue';
import OutfitsGallery from './OutfitsGallery.vue';
import OutfitsViewDialog from './OutfitsViewDialog.vue';

const { filterFileFields } = useHelpers();

const galleryPagination = new PaginationOptions(1, 20);
const GALLERY_POLL_INTERVAL_MS = 3000;
const GALLERY_POLL_JOB_ESTIMATE_MS = 120000;
const GALLERY_POLL_BUFFER_ATTEMPTS = 10;
const BATCH_SIZE_OPTIONS = [3, 6, 9, 12];

const outfitStore = useOutfitStore();
const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();
const router = useRouter();

const savingProfile = ref(false);
const loadingCounts = ref(false);
const loadingGallery = ref(false);
const galleryPageLoading = ref(false);
const showGallery = ref(false);
const typeCounts = ref({});
const combinationStats = ref(null);
const loadingCombinationStats = ref(false);
const galleryItems = ref([]);
const galleryTotalRecords = ref(0);
const pendingBatchIds = ref(new Set());
const showViewDialog = ref(false);
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
const batchSize = ref(3);

const settingsInitialData = ref({
    gender: null,
    height: null,
    height_ft: '',
    face_image: null,
    face_mode: 'ai_model'
});

const requiresFaceImage = computed(() => formData.value.face_mode === 'user_face');

const maxBatchSize = computed(() => {
    const remaining = combinationStats.value?.remaining;

    if (remaining == null || remaining <= 0) {
        return 12;
    }

    return Math.min(12, remaining);
});

const batchSizeOptions = computed(() =>
    BATCH_SIZE_OPTIONS.filter((size) => size <= maxBatchSize.value)
);

watch(
    batchSizeOptions,
    (options) => {
        if (!options.length) {
            return;
        }

        if (!options.includes(batchSize.value)) {
            batchSize.value = options[options.length - 1];
        }
    },
    { immediate: true }
);

const generateButtonLabel = computed(() =>
    $t('outfits_generate_count', { count: batchSize.value })
);

const showCombinationStats = computed(() => {
    const stats = combinationStats.value;
    return Boolean(stats?.wardrobe_ready && stats.total_possible > 0);
});

const generationProgress = computed(() => {
    const stats = combinationStats.value;
    if (!stats?.total_possible) return 0;
    return Math.round((stats.generated_count / stats.total_possible) * 100);
});

const galleryCreatedCount = computed(
    () => combinationStats.value?.generated_count ?? galleryItems.value.length
);

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

const scrollToSettings = () => {
    document
        .getElementById('outfits-generation-settings')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

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

const goToWardrobe = () => {
    router.push({ name: 'Wardrobe' });
};

const loadProfile = async () => {
    const user = sessionStore.user;
    if (!user?.uuid) return;

    try {
        await profileStore.getItem(user.uuid);
    } catch {
        // Fall back to the session user if the profile fetch fails.
    }

    const profile = profileStore.currentItem ?? sessionStore.user ?? user;
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

    galleryItems.value = incoming.map(
        (item) => byUuid.get(item.uuid) ?? item
    );
    showGallery.value = galleryItems.value.length > 0 || galleryTotalRecords.value > 0;
};

const loadGallery = async ({ silent = false } = {}) => {
    const params = galleryPagination.getPageParams();
    const payload = silent
        ? (await OutfitService.list(params)).data
        : await outfitStore.list(params);

    galleryTotalRecords.value = payload.meta?.total ?? payload.data?.length ?? 0;

    if (!payload.data?.length) {
        galleryItems.value = [];

        if (galleryPagination.page === 1) {
            showGallery.value = galleryTotalRecords.value > 0;
        }

        return galleryTotalRecords.value > 0;
    }

    showGallery.value = true;
    galleryItems.value = mapGalleryItems(payload.data);

    return true;
};

const loadGallerySilently = async () => loadGallery({ silent: true });

const onGalleryPageChange = async (event) => {
    galleryPagination.updatePageParams(event);

    try {
        galleryPageLoading.value = true;
        await loadGallery();
    } finally {
        galleryPageLoading.value = false;
    }
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

        if ((payload.meta?.pending ?? 0) === 0) {
            const next = new Set(pendingBatchIds.value);
            next.delete(batchId);
            pendingBatchIds.value = next;
        }
    }

    if (hasPendingGalleryItems() || pendingBatchIds.value.size > 0) {
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

const openSettingsForMissingProfile = async (message) => {
    globalStore.showError($t('validation_error'), message);
    scrollToSettings();
};

const onFaceFileSelect = (event) => {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        formData.value.face_image = e.target.result;
        await saveProfile({ showErrors: true });
    };
    reader.readAsDataURL(file);
};

const saveProfile = async ({ showErrors = true } = {}) => {
    const user = sessionStore.user;
    if (!user?.uuid) return false;

    if (!parseFeetInchesInput(heightFtInput.value)) {
        if (showErrors) {
            globalStore.showError(
                $t('validation_error'),
                $t('height_ft_invalid')
            );
        }
        return false;
    }

    try {
        savingProfile.value = true;
        globalStore.clearErrors();
        const height = normalizeHeightFromFeet(heightFtInput.value);

        if (height === null) {
            if (showErrors) {
                globalStore.showError(
                    $t('validation_error'),
                    $t('height_ft_out_of_range')
                );
            }
            return false;
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

        if (
            formData.value.face_image === null
            && settingsInitialData.value.face_image
        ) {
            payload.face_image = null;
        }
        await profileStore.update(user.uuid, payload, { silent: true });
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
        return true;
    } catch (error) {
        if (showErrors) {
            globalStore.showError(
                $t('validation_error'),
                getValidationErrorMessage(error, $t('something_went_wrong'))
            );
        }
        return false;
    } finally {
        savingProfile.value = false;
    }
};

const isOutfitPending = (item) =>
    item?.status === 'pending' || item?.status === 'processing';

const openViewDialog = (item) => {
    selectedOutfit.value = item;
    showViewDialog.value = true;
};

const createOutfits = async () => {
    try {
        if (requiresFaceImage.value && !formData.value.face_image) {
            globalStore.showError(
                $t('validation_error'),
                $t('outfit_face_image_required')
            );
            scrollToSettings();
            return;
        }

        const saved = await saveProfile({ showErrors: true });
        if (!saved) {
            scrollToSettings();
            return;
        }

        loadingGallery.value = true;
        showGallery.value = true;
        const res = await outfitStore.generate({ count: batchSize.value });
        applyCombinationStats(res.meta);
        registerBatchForPolling(res.meta?.batch_id);
        galleryPagination.resetPageParams();

        if (res.data?.length) {
            mergeGalleryItems(mapGalleryItems(res.data));
        }

        await loadGallerySilently();
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
            <OutfitsHeader />

            <div class="outfits-hero-grid">
                <OutfitsCapacityCard
                    :loading="loadingCounts"
                    :type-counts="typeCounts"
                    :combination-stats="combinationStats"
                    :progress-percent="generationProgress"
                    :show-stats="showCombinationStats"
                    @go-wardrobe="goToWardrobe"
                />

                <OutfitsGenerationSettings
                    :form-data="formData"
                    v-model:height-ft-input="heightFtInput"
                    v-model:batch-size="batchSize"
                    :batch-size-options="batchSizeOptions"
                    :saving="savingProfile"
                    :generate-label="generateButtonLabel"
                    :loading="loadingGallery"
                    :disabled="isGenerateDisabled"
                    :can-create="$ability.can('core.outfits.create')"
                    :gender-error="genderFieldError"
                    :height-error="heightFieldError"
                    :face-error="faceFieldError"
                    :requires-face-image="requiresFaceImage"
                    @gender-change="saveProfile({ showErrors: false })"
                    @face-mode-change="saveProfile({ showErrors: false })"
                    @height-blur="saveProfile({ showErrors: true })"
                    @face-select="onFaceFileSelect"
                    @face-remove="saveProfile({ showErrors: false })"
                    @generate="createOutfits"
                />
            </div>

            <OutfitsGallery
                :show="showGallery"
                :items="galleryItems"
                :page-loading="galleryPageLoading"
                :created-count="galleryCreatedCount"
                :page="galleryPagination.page"
                :total-records="galleryTotalRecords"
                :page-size="galleryPagination.limit"
                @open-item="openViewDialog"
                @page-change="onGalleryPageChange"
            />
        </section>
    </section>

    <OutfitsViewDialog
        v-model:visible="showViewDialog"
        :item="selectedOutfit"
        @update:visible="(value) => { if (!value) selectedOutfit = null; }"
    />
</template>
