import App from './App.vue';
import { createApp } from 'vue';
import router from '@/routes';
import { registerPlugins } from '@/plugins';

export const app = createApp(App);
registerPlugins(app);

router.isReady().then(() => {
    app.mount('#app');
});
