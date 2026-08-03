export function getValidationErrorMessage(error, fallback = '') {
    const errors = error?.response?.data?.errors;

    if (errors) {
        const first = Object.values(errors).flat().find(Boolean);

        if (first) {
            return first;
        }
    }

    return error?.response?.data?.message ?? fallback;
}
