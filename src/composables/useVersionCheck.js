import { onMounted, onUnmounted, ref } from 'vue';

const POLLING_INTERVAL = 30000;

/**
 * Polls version.json (generated at build) and reloads the app when a new deployment is detected.
 */
export function useVersionCheck() {
    const currentVersion = ref(null);
    const isPolling = ref(false);
    let intervalId = null;

    function versionUrl() {
        const base = import.meta.env.BASE_URL || '/';
        const root = base.endsWith('/') ? base : `${base}/`;
        return `${root}version.json`;
    }

    async function fetchVersion() {
        try {
            const response = await fetch(`${versionUrl()}?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache'
                }
            });
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    }

    async function checkVersion() {
        const versionData = await fetchVersion();
        if (!versionData) return;
        if (currentVersion.value === null) {
            currentVersion.value = versionData.timestamp;
            return;
        }
        if (versionData.timestamp !== currentVersion.value) {
            window.location.reload();
        }
    }

    function startPolling() {
        if (isPolling.value) return;
        isPolling.value = true;
        checkVersion();
        intervalId = setInterval(checkVersion, POLLING_INTERVAL);
    }

    function stopPolling() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        isPolling.value = false;
    }

    onMounted(() => {
        if (import.meta.env.DEV) return;
        startPolling();
    });

    onUnmounted(() => {
        if (import.meta.env.DEV) return;
        stopPolling();
    });

    return {
        currentVersion,
        isPolling,
        startPolling,
        stopPolling,
        checkVersion
    };
}
