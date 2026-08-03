<script setup>
import { onBeforeMount, ref, nextTick } from 'vue';
import { useGlobalStore } from '@/stores';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import { useProfileStore } from '@/stores';
import { useSessionStore } from '@/stores';
import UserInfo from '@/components/profile/tabs/UserInfo.vue';
import { useFormDirty } from '@/composables/useFormDirty';
import { useHelpers } from '@/composables/useHelpers';

const globalStore = useGlobalStore();
const router = useRouter();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const currentUser = sessionStore.user;
const { filterFileFields, formatDateForApi, normalizeDateForPicker } =
    useHelpers();

const busy = ref(false);
const loading = ref(false);
const showUnsavedDialog = ref(false);
const userId = currentUser.uuid;

const resetKey = ref(0);
let nextRoute = null;

const formData = ref({
    name: '',
    status: 'pending',
    email: '',
    gender: null,
    date_of_birth: null,
    role_id: '',
    role_uuid: '',
    preferred_language_uuid: null,
    preferred_language: null,
    profile_image: null
});

const { isDirty, resetDirty } = useFormDirty(formData);

onBeforeMount(async () => {
    globalStore.clearErrors();
    await getItem();
});

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

const pushRoute = (name, params = {}) => {
    router.push({ name, params });
};

function cancel() {
    showUnsavedDialog.value = true;
}

function goBack() {
    pushRoute('Wardrobe');
}

function mapResponseToForm(data = {}) {
    const allowedKeys = Object.keys(formData.value);
    const mapped = {};

    for (const key of allowedKeys) {
        if (key in data) {
            mapped[key] = data[key] ?? formData.value[key];
        } else {
            mapped[key] = formData.value[key];
        }
    }

    mapped.role_id = data.role?.id || '';
    mapped.role_uuid = data.role?.uuid || '';
    mapped.preferred_language_uuid =
        data.preferred_language_uuid ?? data.preferred_language?.uuid ?? null;
    mapped.preferred_language = data.preferred_language ?? null;
    mapped.date_of_birth = normalizeDateForPicker(data.date_of_birth);
    mapped.gender = data.gender ?? null;

    nextTick(() => {
        formData.value = { ...formData.value, ...mapped };
    });
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        resetForm();
    }
}

async function resetForm() {
    globalStore.clearErrors();
    await getItem();
    resetKey.value++;
    resetDirty(formData.value);
}

const save = async () => {
    try {
        busy.value = true;
        const {
            preferred_language: _preferredLanguage,
            email: _email,
            ...formValues
        } = formData.value;
        const payload = filterFileFields(formValues, ['profile_image']);
        payload.date_of_birth = formatDateForApi(formData.value.date_of_birth);
        await profileStore.update(userId, payload);
        resetForm();
        window.location.reload();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!userId) return;
    try {
        loading.value = true;
        const params = {
            include: 'role,preferredLanguage'
        };

        const res = await profileStore.getItem(userId, params);
        mapResponseToForm(res?.data);

        await nextTick();
        resetDirty(formData.value);
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        type="button"
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        size="large"
                        @click="goBack"
                        iconClass="!text-sm"
                        :disabled="busy"
                    />
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                            {{ $t('my_profile') }}
                        </h1>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    :label="$t('cancel')"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="cancel"
                    :disabled="busy || !isDirty"
                />
                <Button
                    :label="$t('save')"
                    icon="pi pi-check"
                    iconPos="left"
                    class="w-full sm:w-auto"
                    @click="save"
                    :disabled="busy || !isDirty"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card>
            <template #content>
                <UserInfo
                    :key="`info-${resetKey}`"
                    :formData="formData"
                    :busy="busy"
                    @save="save"
                />
            </template>
        </Card>
    </template>

    <Confirmation
        v-model="showUnsavedDialog"
        :header="$t('unsaved_changes')"
        :content="
            $t(
                'you_have_unsaved_changes_if_you_continue_those_changes_will_be_lost_do_you_want_to_discard_them'
            )
        "
        variant="danger"
        :confirmButtonText="$t('discard_changes')"
        :cancelButtonText="$t('keep_editing')"
        @confirm="confirmDiscard"
    />
</template>
