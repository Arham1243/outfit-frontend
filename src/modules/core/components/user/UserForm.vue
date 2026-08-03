<script setup>
import { onBeforeMount, ref, nextTick, computed } from 'vue';
import { useUserStore } from '@/modules/core/stores';
import { useGlobalStore } from '@/stores';
import { useRoute, useRouter } from 'vue-router';
import UserInfo from '@/modules/core/components/user/tabs/UserInfo.vue';
import UserPermissions from '@/modules/core/components/user/tabs/UserPermissions.vue';
import { useFormDirty } from '@/composables/useFormDirty';
import { useHelpers } from '@/composables';
import useEventsBus from '@/composables/useEventsBus';

const globalStore = useGlobalStore();
const { formatDateForApi, normalizeDateForPicker } = useHelpers();

function onTabSelect(tabValue) {
    activeTab.value = String(tabValue);
}

const props = defineProps({
    mode: { type: String, required: true }
});

const { emit } = useEventsBus();
const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const busy = ref(false);
const loading = ref(false);
const userId = ref(route.params.id);
const isEditMode = ref(props.mode === 'edit');
const showUnsavedDialog = ref(false);
const showResendWelcomeDialog = ref(false);
const activeTab = ref('0');
const resetKey = ref(0);
const formData = ref({
    name: '',
    status: 'pending',
    email: '',
    gender: null,
    date_of_birth: null,
    role_id: '',
    role_uuid: '',
    preferred_language_uuid: null,
    preferred_language: null
});
const { isDirty, resetDirty } = useFormDirty(formData);

const showResendWelcome = computed(
    () => isEditMode.value && formData.value.status === 'pending'
);

onBeforeMount(async () => {
    globalStore.clearErrors();
    if (props.mode === 'edit') {
        await getItem();
        emit('updateDetailsBreadcrumb', userStore.currentItem?.name || '');
    }
});

const pushRoute = (name, params = {}) => {
    router.push({ name, params });
};

function cancel() {
    showUnsavedDialog.value = true;
}

function goBack() {
    pushRoute('Users');
}

function mapResponseToForm(data = {}) {
    formData.value = {
        ...formData.value,
        name: data.name ?? '',
        status: data.status ?? 'pending',
        email: data.email ?? '',
        gender: data.gender ?? null,
        date_of_birth: normalizeDateForPicker(data.date_of_birth),
        role_id: data.role?.id ?? data.role_id ?? '',
        role_uuid: data.role?.uuid ?? '',
        preferred_language_uuid:
            data.preferred_language_uuid ??
            data.preferred_language?.uuid ??
            null,
        preferred_language: data.preferred_language ?? null
    };
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    resetForm();
}

async function resetForm() {
    globalStore.clearErrors();
    if (isEditMode.value) {
        await getItem();
    } else {
        Object.assign(formData.value, {
            name: '',
            status: 'pending',
            email: '',
            gender: null,
            date_of_birth: null,
            role_id: '',
            role_uuid: '',
            preferred_language_uuid: null,
            preferred_language: null
        });
        await applyDefaultLanguageForNewUser();
    }
    resetKey.value++;
    resetDirty(formData.value);
}

function openResendWelcomeDialog() {
    showResendWelcomeDialog.value = true;
}

async function confirmResendWelcome() {
    if (!userId.value) return;
    try {
        busy.value = true;
        await userStore.resendWelcomeEmail(userId.value);
    } catch (e) {
        console.error(e);
    } finally {
        busy.value = false;
    }
}

const save = async () => {
    const { preferred_language: _preferredLanguage, role_uuid: _roleUuid, ...payload } =
        formData.value;
    payload.date_of_birth = formatDateForApi(formData.value.date_of_birth);

    try {
        busy.value = true;
        if (props.mode === 'new') {
            const res = await userStore.create(payload);
            resetForm();
            pushRoute('EditUser', { id: res?.data?.uuid });
        } else if (props.mode === 'edit') {
            await userStore.update(userId.value, payload);
            resetForm();
        }
        await getItem();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
};

const getItem = async () => {
    if (!userId.value) return;
    try {
        loading.value = true;
        const params = {
            include: 'role,preferredLanguage'
        };

        const res = await userStore.getItem(userId.value, params);
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
                            {{
                                props.mode === 'new'
                                    ? 'New User'
                                    : userStore.currentItem?.name
                            }}
                        </h1>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    v-if="showResendWelcome"
                    :label="$t('resend_welcome_email')"
                    icon="pi pi-envelope"
                    iconPos="left"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="openResendWelcomeDialog"
                    :disabled="busy"
                />
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
                    :disabled="busy"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="tabs-card">
            <template #content>
                <Tabs :value="activeTab" @update:value="onTabSelect">
                    <TabList>
                        <Tab value="0">{{ $t('information') }}</Tab>
                        <Tab v-if="isEditMode" value="1">{{
                            $t('permissions')
                        }}</Tab>
                    </TabList>
                    <div class="py-4">
                        <TabPanels class="!px-0">
                            <TabPanel value="0">
                                <UserInfo
                                    :key="`info-${isEditMode ? 1 : 0}-${resetKey}`"
                                    :formData="formData"
                                    :isEditMode="isEditMode"
                                    :busy="busy"
                                    @save="save"
                                />
                            </TabPanel>
                            <TabPanel v-if="isEditMode" value="1">
                                <UserPermissions
                                    :key="`permissions-${resetKey}`"
                                    :formData="formData"
                                    :isEditMode="isEditMode"
                                    :busy="busy"
                                    @save="save"
                                />
                            </TabPanel>
                        </TabPanels>
                    </div>
                </Tabs>
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

    <Confirmation
        v-model="showResendWelcomeDialog"
        :header="$t('resend_welcome_email')"
        :content="
            $t(
                'send_the_setup_password_email_again_to_this_user_any_previous_link_in_older_emails_will_stop_working_once_the_new_email_is_sent'
            )
        "
        variant="success"
        :confirmButtonText="$t('send_email')"
        :cancelButtonText="$t('cancel')"
        @confirm="confirmResendWelcome"
    />
</template>
