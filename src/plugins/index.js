import router from '@/routes';
import pinia from '@/stores';
import PrimeVue from 'primevue/config';
import AppPreset from './app-preset';
import { abilitiesPlugin } from '@casl/vue';
import { ability } from '@/plugins/ability';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import BaseDialog from '@/components/common/BaseDialog.vue';
import ApiDropdown from '@/components/common/ApiDropdown.vue';
import BccRecipientsField from '@/components/common/BccRecipientsField.vue';
import { install as VueRecaptchaInstall } from 'vue3-recaptcha-v2';
import '@/assets/css/styles.scss';

import { registerI18n } from '@/plugins/i18n';

export function registerPlugins(app) {
    app.use(pinia);
    registerI18n(app);
    app.use(router);
    app.use(PrimeVue, {
        ripple: true,
        theme: {
            preset: AppPreset,
            options: {
                darkModeSelector: '.app-dark'
            }
        }
    });
    app.component('BaseDialog', BaseDialog);
    app.component('ApiDropdown', ApiDropdown);
    app.component('BccRecipientsField', BccRecipientsField);
    app.use(abilitiesPlugin, ability, {
        useGlobalProperties: true
    });

    app.use(ToastService);
    app.use(ConfirmationService);

    app.use(VueRecaptchaInstall, {
        sitekey: '6Ld_hcgsAAAAAFGLs0kl7QyQEHM8Qctq1mmquAWi',
        useRecaptchaNet: true
    });
}
