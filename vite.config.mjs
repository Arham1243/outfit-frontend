import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { PrimeVueResolver } from '@primevue/auto-import-resolver';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';

function versionPlugin() {
    return {
        name: 'version-plugin',
        writeBundle(options) {
            const versionData = {
                version: process.env.npm_package_version || '0.0.0',
                timestamp: Date.now(),
                buildDate: new Date().toISOString()
            };
            const outputDir = options.dir || 'dist';
            const versionPath = path.join(outputDir, 'version.json');
            fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
        }
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    optimizeDeps: {
        noDiscovery: true,
        include: ['quill']
    },
    plugins: [
        versionPlugin(),
        vue(),
        Components({
            resolvers: [PrimeVueResolver()]
        })
    ],
    server: {
        host: true,
        port: 3000
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
});
