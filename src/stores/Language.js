import { defineStore } from 'pinia';
import { LanguageService } from '@/services';
import { useGlobalStore } from '@/stores';

export const useLanguageStore = defineStore('LanguageStore', () => {
    const globalStore = useGlobalStore();

    const getActiveLanguages = () => {
        return globalStore.actionWrapper(async () => {
            return LanguageService.getActiveLanguages();
        });
    };

    return {
        getActiveLanguages
    };
});
