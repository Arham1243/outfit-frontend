<script setup>
import { computed, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { useOutfitStore } from '@/modules/core/stores';
import { OUTFIT_FACE_IMAGE } from '@/config';
import { useGlobalStore, useProfileStore, useSessionStore } from '@/stores';
import { useHelpers } from '@/composables/useHelpers';
import { getValidationErrorMessage } from '@/utils/apiErrors';
import { formatMissingWardrobeGroups } from '@/config/outfitRequirements';
import {
    cmToFeetInchesInput,
    feetInchesInputToCm,
    parseFeetInchesInput
} from '@/utils/heightConversion';

const { filterFileFields } = useHelpers();

const GALLERY_LIMIT = 50;
const GALLERY_POLL_INTERVAL_MS = 3000;
const GALLERY_POLL_MAX_ATTEMPTS = 40;

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
const galleryItems = ref([]);
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
    face_image: null,
    face_mode: 'ai_model'
});

const genderOptions = [
    { name: $t('male'), code: 'male' },
    { name: $t('female'), code: 'female' }
];

const faceModeOptions = [
    { name: $t('outfit_face_mode_ai_model'), code: 'ai_model' },
    { name: $t('outfit_face_mode_user_face'), code: 'user_face' },
    { name: $t('outfit_face_mode_user_body_ai_face'), code: 'user_body_ai_face' }
];

const requiresFaceImage = computed(() =>
    ['user_face', 'user_body_ai_face'].includes(formData.value.face_mode)
);

const settingsDialogFormData = computed(() => formData.value);

const sortedTypeCounts = computed(() => {
    return Object.entries(typeCounts.value)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b));
});

const generateButtonLabel = computed(() =>
    galleryItems.value.length ? $t('generate_more') : $t('generate')
);

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
    await Promise.all([loadProfile(), loadTypeCounts(), loadGallery()]);
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
    formData.value.face_mode = profile.face_mode ?? 'ai_model';
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

const mapGalleryItems = (items) =>
    (items ?? []).map((item, index) => ({
        ...item,
        _key: item.uuid ?? `outfit-${index}`
    }));

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

    galleryPollTimer = setInterval(async () => {
        galleryPollAttempts += 1;

        try {
            await loadGallery();
        } catch {
            stopGalleryPolling();
            return;
        }

        if (!hasPendingGalleryItems() || galleryPollAttempts >= GALLERY_POLL_MAX_ATTEMPTS) {
            stopGalleryPolling();
        }
    }, GALLERY_POLL_INTERVAL_MS);
};

const openSettingsDialog = async () => {
    await loadProfile();
    settingsInitialData.value = {
        gender: formData.value.gender,
        height: formData.value.height,
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
    heightFtInput.value = cmToFeetInchesInput(settingsInitialData.value.height);
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
        settingsInitialData.value = {
            gender: formData.value.gender,
            height: formData.value.height,
            face_image: formData.value.face_image,
            face_mode: formData.value.face_mode
        };
        heightFtInput.value = cmToFeetInchesInput(formData.value.height);
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

const openSettingsForMissingProfile = async (message) => {
    globalStore.showError($t('validation_error'), message);
    await openSettingsDialog();
};

const createOutfits = async () => {
    try {
        loadingGallery.value = true;
        showGallery.value = true;
        await outfitStore.generate();
        await loadGallery();
        startGalleryPolling();
    } catch (error) {
        const responseData = error?.response?.data;
        if (error?.response?.status === 422) {
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

            <Button
                v-if="$ability.can('core.outfits.create')"
                class="outfits-hero__create"
                :label="generateButtonLabel"
                icon="pi pi-sparkles"
                :loading="loadingGallery"
                @click="createOutfits"
            />
        </header>

        <section v-if="showGallery" class="outfits-gallery-section">
            <Loader v-if="loadingGallery && !galleryItems.length" />

            <div v-else-if="galleryItems.length" class="outfits-gallery">
                <article
                    v-for="item in galleryItems"
                    :key="item._key"
                    class="outfits-gallery__tile"
                    :class="{
                        'outfits-gallery__tile--pending': isOutfitPending(item),
                        'outfits-gallery__tile--failed': isOutfitFailed(item)
                    }"
                >
                    <Image
                        v-if="item.image_url"
                        :src="item.image_url"
                        :alt="$t('outfit_preview')"
                        preview
                        imageClass="outfits-gallery__img"
                    >
                        <template #preview="slotProps">
                            <img
                                :src="item.image_url"
                                :alt="$t('outfit_preview')"
                                :class="[slotProps.class, 'outfit-image-preview']"
                                :style="slotProps.style"
                                @click="slotProps.previewCallback"
                            />
                        </template>
                    </Image>
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
                </article>
            </div>
        </section>
    </section>

    <BaseDialog
        v-model:visible="showSettingsDialog"
        :header="$t('outfit_settings')"
        :busy="savingProfile"
        :isEditMode="true"
        :formData="settingsDialogFormData"
        :initialData="settingsInitialData"
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
.outfits-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.outfits-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem 0 0.5rem;
    max-width: 42rem;
    margin: 0 auto;
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
    padding-bottom: 2rem;
}

.outfits-gallery {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.35rem;
}

.outfits-gallery__tile {
    position: relative;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 0.35rem;
    background: var(--p-surface-100, #f1f5f9);
}

.outfits-gallery__tile :deep(.p-image) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}

.outfits-gallery__tile :deep(.p-image-preview) {
    object-fit: contain;
}

.outfits-gallery__tile :deep(.outfits-gallery__img),
.outfits-gallery__tile :deep(img) {
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

@media (max-width: 768px) {
    .outfits-gallery {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 480px) {
    .outfits-gallery {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}
</style>
