import { ref, watch, unref, computed } from 'vue';

/**
 * Form Dirty Tracking Composable
 *
 * DEBUG MODE:
 * To debug form dirty issues, open browser console and run:
 *   window.toggleFormDirtyDebug(true)  // Enable debugging
 *   window.toggleFormDirtyDebug(false) // Disable debugging
 *
 * When enabled, you'll see:
 * - 🔴 When form becomes dirty (with changed fields)
 * - ✅ When form becomes clean
 * - 🔄 When resetDirty is called
 * - Current vs Default values for changed fields
 *
 * USAGE:
 * const { isDirty, resetDirty } = useFormDirty(formData, null, {
 *   excludeKeys: ['permissions', 'otherKey'] // Optional: keys to exclude from dirty checking
 * });
 */

// Global debug flag - set to true to enable form dirty debugging
let debugFormDirty = false;

/**
 * Enable or disable form dirty debugging
 * Usage in browser console: window.toggleFormDirtyDebug(true)
 */
export function toggleFormDirtyDebug(enable) {
    debugFormDirty = enable;
    console.log(`🔍 Form Dirty Debug: ${enable ? 'ENABLED' : 'DISABLED'}`);
}

// Make it available globally for easy access in browser console
if (typeof window !== 'undefined') {
    window.toggleFormDirtyDebug = toggleFormDirtyDebug;
}

export function useFormDirty(formRef, initialDataRef = null, options = {}) {
    const isDirty = ref(false);
    const defaults = ref({});
    const { excludeKeys = [] } = options;

    const sanitize = (obj, keys) => {
        if (!obj) return {};
        const raw = JSON.parse(JSON.stringify(unref(obj)));
        return keys.reduce((acc, key) => {
            // Skip excluded keys
            if (!excludeKeys.includes(key)) {
                acc[key] = raw[key];
            }
            return acc;
        }, {});
    };

    const updateDirtyState = () => {
        const form = unref(formRef);
        if (!form) {
            isDirty.value = false;
            return;
        }

        const keys = Object.keys(form).filter(
            (key) => !excludeKeys.includes(key)
        );
        const current = sanitize(form, keys);
        const defaultValues = sanitize(defaults.value, keys);
        const wasDirty = isDirty.value;
        isDirty.value =
            JSON.stringify(current) !== JSON.stringify(defaultValues);

        // Log when form becomes dirty (only if debug is enabled)
        if (debugFormDirty && !wasDirty && isDirty.value) {
            console.log('🔴 Form became DIRTY');
            console.log('Current values:', current);
            console.log('Default values:', defaultValues);

            // Find which fields changed
            const changedFields = [];
            keys.forEach((key) => {
                if (
                    JSON.stringify(current[key]) !==
                    JSON.stringify(defaultValues[key])
                ) {
                    changedFields.push({
                        field: key,
                        current: current[key],
                        default: defaultValues[key]
                    });
                }
            });
            console.log('Changed fields:', changedFields);
        }

        // Log when form becomes clean (only if debug is enabled)
        if (debugFormDirty && wasDirty && !isDirty.value) {
            console.log('✅ Form became CLEAN');
        }
    };

    const resetDirty = (initial = null) => {
        if (debugFormDirty) {
            console.log('🔄 resetDirty called');
        }
        const form = unref(formRef);
        if (!form) {
            defaults.value = {};
            isDirty.value = false;
            return;
        }

        const keys = Object.keys(form).filter(
            (key) => !excludeKeys.includes(key)
        );

        // If no initial data provided, use current form as baseline
        if (!initial) {
            defaults.value = sanitize(form, keys);
            isDirty.value = false;
            if (debugFormDirty) {
                console.log('Reset with current form as baseline');
            }
            return;
        }

        // Set defaults to initial data
        defaults.value = sanitize(initial, keys);

        // Compare current form with initial data
        const current = sanitize(form, keys);
        const areEqual =
            JSON.stringify(current) === JSON.stringify(defaults.value);
        isDirty.value = !areEqual;

        if (debugFormDirty) {
            console.log('Reset with initial data. Are equal?', areEqual);
            if (!areEqual) {
                console.log('Current:', current);
                console.log('Defaults:', defaults.value);
            }
        }
    };

    // Watch for changes in formData
    watch(formRef, updateDirtyState, { deep: true });

    // Watch for changes in initialData if provided
    if (initialDataRef) {
        watch(
            initialDataRef,
            (newInitialData) => {
                if (newInitialData) {
                    const form = unref(formRef);
                    if (form) {
                        const keys = Object.keys(form);
                        defaults.value = sanitize(newInitialData, keys);
                        updateDirtyState();
                    }
                }
            },
            { deep: true }
        );
    }

    return { isDirty, resetDirty };
}
