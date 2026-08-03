import i18n from '@/i18n';

export function registerI18n(app) {
    app.use(i18n);
    const $t = i18n.global.t;
    app.config.globalProperties.$t = $t;
    globalThis.$t = $t;
}
