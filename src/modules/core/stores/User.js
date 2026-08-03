import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { UserService } from '@/modules/core/services';

export const useUserStore = defineStore('UserStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const list = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.list(payload, params);
            return res.data;
        });
    };

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.search(payload, params);
            return res.data;
        });
    };

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const getUserPermissions = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.getUserPermissions(id, params);
            return res.data;
        });
    };

    const listUserPermissions = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.listUserPermissions(id, params);
            return res.data;
        });
    };

    const create = (payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.create(payload);
            globalStore.showSuccess(
                $t('user_created'),
                $t('user_created_successfully')
            );
            return res.data;
        });
    };
    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.update(id, payload);
            globalStore.showSuccess(
                $t('user_updated'),
                $t('user_updated_successfully')
            );
            return res.data;
        });
    };
    const changeStatus = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.changeStatus(id, payload);
            globalStore.showSuccess(
                $t('user_status_updated'),
                $t('user_status_updated_successfully')
            );
            return res.data;
        });
    };

    const resendWelcomeEmail = (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.resendWelcomeEmail(id);
            globalStore.showSuccess(
                $t('welcome_email_sent'),
                $t('the_welcome_email_has_been_sent_again')
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await UserService.deleteItem(id);
            globalStore.showSuccess(
                $t('user_deleted'),
                $t('user_deleted_successfully')
            );
            return res.data;
        });
    };

    return {
        changeStatus,
        search,
        list,
        create,
        update,
        deleteItem,
        currentItem,
        getUserPermissions,
        listUserPermissions,
        getItem,
        resendWelcomeEmail
    };
});
