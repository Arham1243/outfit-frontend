<script setup>
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOutfitStore } from '@/modules/core/stores';
import { useGlobalStore, useProfileStore, useSessionStore } from '@/stores';
import { useHelpers } from '@/composables';
import { getValidationErrorMessage } from '@/utils/apiErrors';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import {
    formatMissingWardrobeGroups,
    getMissingWardrobeGroups,
    isProfileReadyForOutfits
} from '@/config/outfitRequirements';

const FACE_IMAGE_MAX_SIZE = 500 * 1024;
const PAGE_LIMIT = 12;

const outfitStore = useOutfitStore();
const profileStore = useProfileStore();
const sessionStore = useSessionStore();
const globalStore = useGlobalStore();
const router = useRouter();
const { filterFileFields } = useHelpers();

const savingProfile = ref(false);
const loadingCounts = ref(false);
const loadingGallery = ref(false);
const loadingMore = ref(false);
const showGallery = ref(false);
const showSettingsDialog = ref(false);
const typeCounts = ref({});
const wardrobeTotal = ref(0);
const galleryItems = ref([]);
const currentPage = ref(0);
const lastPage = ref(1);
const loadMoreRef = ref(null);
let loadMoreObserver = null;

const formData = ref({
    height: null,
    face_image: null
});

const settingsInitialData = ref({
    height: null,
    face_image: null
});

const settingsDialogFormData = computed(() => formData.value);

const sortedTypeCounts = computed(() => {
    return Object.entries(typeCounts.value)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b));
});

const hasMorePages = computed(
    () => showGallery.value && currentPage.value < lastPage.value
);

const heightFieldError = computed(() => {
    const messages = globalStore.errors?.height;
    if (!messages) return '';
    return Array.isArray(messages) ? messages[0] : messages;
});

const faceFieldError = computed(() => {
    const messages = globalStore.errors?.face_image;
    if (!messages) return '';
    return Array.isArray(messages) ? messages[0] : messages;
});

const normalizeHeight = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.round(parsed);
};

onBeforeMount(async () => {
    await Promise.all([loadProfile(), loadTypeCounts()]);
});

onBeforeUnmount(() => {
    loadMoreObserver?.disconnect();
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

    await profileStore.getItem(user.uuid);
    const profile = profileStore.currentItem ?? user;
    formData.value.height = profile.height ?? null;
    formData.value.face_image = profile.face_image ?? null;
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

const onFaceImageSelect = (event) => {
    const file = event.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.face_image = e.target.result;
    };
    reader.readAsDataURL(file);
};

const openSettingsDialog = async () => {
    await loadProfile();
    settingsInitialData.value = {
        height: formData.value.height,
        face_image: formData.value.face_image
    };
    showSettingsDialog.value = true;
};

const onSettingsCancel = () => {
    formData.value = {
        height: settingsInitialData.value.height,
        face_image: settingsInitialData.value.face_image
    };
    globalStore.clearErrors();
};

const saveProfile = async () => {
    const user = sessionStore.user;
    if (!user?.uuid) return;

    try {
        savingProfile.value = true;
        globalStore.clearErrors();
        const height = normalizeHeight(formData.value.height);
        formData.value.height = height;
        const payload = filterFileFields(
            {
                height,
                face_image: formData.value.face_image
            },
            ['face_image']
        );
        await profileStore.update(user.uuid, payload);
        await sessionStore.me();
        settingsInitialData.value = {
            height: formData.value.height,
            face_image: formData.value.face_image
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

const fetchGalleryPage = async (page, append = false) => {
    const res = await outfitStore.list({ page, limit: PAGE_LIMIT });
    applyGalleryResponse(res, page, append);
};

const applyGalleryResponse = (res, page, append = false) => {
    const items = (res.data ?? []).map((item, index) => ({
        ...item,
        _key: `${page}-${item.uuid ?? index}`
    }));

    galleryItems.value = append ? [...galleryItems.value, ...items] : items;
    currentPage.value = res.meta?.current_page ?? page;
    lastPage.value = res.meta?.last_page ?? 1;
};

const openSettingsForMissingProfile = async (message) => {
    globalStore.showError($t('validation_error'), message);
    await openSettingsDialog();
};

const createOutfits = async () => {
    await Promise.all([loadProfile(), loadTypeCounts()]);

    if (
        !isProfileReadyForOutfits({
            height: formData.value.height,
            face_image: formData.value.face_image
        })
    ) {
        await openSettingsForMissingProfile($t('outfit_complete_settings_first'));
        return;
    }

    const missingGroups = getMissingWardrobeGroups(typeCounts.value);
    if (missingGroups.length) {
        globalStore.showError(
            $t('validation_error'),
            $t('outfit_missing_wardrobe_detail', {
                groups: formatMissingWardrobeGroups(missingGroups, $t)
            })
        );
        return;
    }

    try {
        loadingGallery.value = true;
        showGallery.value = true;
        const res = await outfitStore.generate({ page: 1, limit: PAGE_LIMIT });
        applyGalleryResponse(res, 1, false);
        await nextTick();
        setupLoadMoreObserver();
    } catch (error) {
        showGallery.value = false;
        galleryItems.value = [];

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

const loadMoreOutfits = async () => {
    if (loadingMore.value || loadingGallery.value || !hasMorePages.value) {
        return;
    }

    try {
        loadingMore.value = true;
        await fetchGalleryPage(currentPage.value + 1, true);
    } finally {
        loadingMore.value = false;
    }
};

const setupLoadMoreObserver = () => {
    loadMoreObserver?.disconnect();
    if (!loadMoreRef.value) return;

    loadMoreObserver = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                loadMoreOutfits();
            }
        },
        { root: null, rootMargin: '240px 0px', threshold: 0 }
    );

    loadMoreObserver.observe(loadMoreRef.value);
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
                :label="$t('generate')"
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
                >
                    <Image
                        :src="item.image_url"
                        :alt="$t('outfit_preview')"
                        preview
                        imageClass="outfits-gallery__img"
                    />
                </article>
            </div>

            <div
                ref="loadMoreRef"
                class="outfits-gallery__sentinel"
                aria-hidden="true"
            >
                <Loader v-if="loadingMore" compact />
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
        <div class="col-span-12">
            <label class="outfits-settings__label" for="outfit-height">
                {{ $t('height') }}
            </label>
            <div
                class="outfits-settings__height-input"
                :class="{ 'outfits-settings__height-input--invalid': !!heightFieldError }"
            >
                <input
                    id="outfit-height"
                    v-model.number="formData.height"
                    type="number"
                    min="50"
                    max="300"
                    step="1"
                    inputmode="numeric"
                    class="outfits-settings__height-value"
                    :disabled="savingProfile"
                    :aria-invalid="!!heightFieldError"
                />
                <span class="outfits-settings__height-unit">{{ $t('cm') }}</span>
            </div>
            <small v-if="heightFieldError" class="outfits-settings__error">
                {{ heightFieldError }}
            </small>
        </div>

        <div class="col-span-12 md:col-span-4">
            <label class="outfits-settings__label">
                {{ $t('face_image') }}
            </label>
            <p class="outfits-settings__face-hint">
                {{ $t('face_image_upload_hint') }}
            </p>
            <div class="outfits-settings__face-preview">
                <img
                    v-if="formData.face_image"
                    :src="formData.face_image"
                    :alt="$t('face_image')"
                    class="outfits-settings__face-img"
                />
                <img
                    v-else
                    :src="PlaceholderImage"
                    :alt="$t('face_image')"
                    class="outfits-settings__face-placeholder"
                />
            </div>
            <FileUpload
                name="faceImage"
                mode="basic"
                customUpload
                auto
                class="outfits-settings__face-upload w-full [&_.p-button]:w-full"
                :chooseLabel="$t('upload')"
                chooseIcon="pi pi-upload"
                :maxFileSize="FACE_IMAGE_MAX_SIZE"
                accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                :disabled="savingProfile"
                @select="onFaceImageSelect"
            />
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

.outfits-settings__face-hint {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, #64748b);
}

.outfits-settings__face-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1 / 1;
    margin-bottom: 0.75rem;
    padding: 0.75rem;
    overflow: hidden;
    border: 2px dashed var(--p-content-border-color, #e2e8f0);
    border-radius: 0.75rem;
    background: var(--p-surface-50, #f8fafc);
}

.outfits-settings__face-img,
.outfits-settings__face-placeholder {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.outfits-settings__face-placeholder {
    opacity: 0.9;
}

.outfits-settings__face-upload {
    width: 100%;
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
    aspect-ratio: 3 / 4;
    overflow: hidden;
    border-radius: 0.35rem;
    background: var(--p-surface-100, #f1f5f9);
}

.outfits-gallery__tile :deep(.p-image) {
    display: block;
    width: 100%;
    height: 100%;
}

.outfits-gallery__tile :deep(.outfits-gallery__img),
.outfits-gallery__tile :deep(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    cursor: pointer;
}

.outfits-gallery__sentinel {
    display: flex;
    justify-content: center;
    min-height: 3rem;
    padding: 1.5rem 0;
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
