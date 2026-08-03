import dayjs from '@/plugins/dayjs';
import { ability } from '@/plugins/ability';
import { useSessionStore } from '@/stores';
import { dateFormats } from '@/config/enums';

/** Normalizes Laravel / Orion envelopes to a plain entity row (e.g. ticket). */
export function unwrapTicketPayload(body) {
    if (!body || typeof body !== 'object') return null;
    let row = body.data !== undefined ? body.data : body;
    if (Array.isArray(row)) row = row[0];
    if (!row || typeof row !== 'object') return null;
    if (row.uuid) return row;
    const attrs = row.attributes;
    if (attrs && typeof attrs === 'object')
        return { ...attrs, id: attrs.id ?? row.id };
    if (row.data && typeof row.data === 'object' && row.data.uuid)
        return row.data;
    return row;
}

export function applyDecimalToInputHoursFields(
    target,
    decimalHours,
    timesheetTimeFormat
) {
    if (decimalHours == null || decimalHours <= 0) {
        return;
    }
    if (timesheetTimeFormat === 'hours_minutes') {
        const totalMinutes = Math.round(decimalHours * 60);
        target.input_hours = Math.floor(totalMinutes / 60);
        target.input_minutes = totalMinutes % 60;
    } else {
        target.input_hours = decimalHours;
        target.input_minutes = 0;
    }
}

function joinCurrencyPartsWithSpace(nf, num) {
    const parts = nf.formatToParts(Number(num));
    let out = '';
    for (const p of parts) {
        if (p.type === 'currency') {
            out += String(p.value).trimEnd() + ' ';
        } else {
            out += p.value;
        }
    }
    return out.trimEnd();
}

export const useHelpers = () => {
    const sessionStore = useSessionStore();
    const resolveAppDateFormat = () => 'dd-mm-yy';

    function appTimeZone() {
        return 'UTC';
    }

    const DEFAULT_MOMENT_DATE_FORMAT = 'MM/DD/YYYY';

    function momentFormatFromCompanyCode(formatCode) {
        const formatObj = dateFormats.find((f) => f.code === formatCode);
        return formatObj ? formatObj.name : DEFAULT_MOMENT_DATE_FORMAT;
    }

    /**
     * @param {string|Date|null|undefined} date
     * @param {{ useCompanySettings?: boolean }} [options]
     */
    function formatDate(date, options) {
        if (date === 'Invalid date' || !date) return '-';

        const useCompany = options?.useCompanySettings === true;
        const momentFormat = useCompany
            ? momentFormatFromCompanyCode(resolveAppDateFormat())
            : DEFAULT_MOMENT_DATE_FORMAT;
        const tz = useCompany ? appTimeZone() : 'UTC';

        const d = String(date).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            return dayjs.tz(d, 'YYYY-MM-DD', tz).format(momentFormat);
        }
        return dayjs.utc(date).tz(tz).format(momentFormat);
    }

    /**
     * @param {string|Date|null|undefined} date
     * @param {{ useCompanySettings?: boolean }} [options]
     */
    function formatDateTime(date, options) {
        if (date === 'Invalid date' || !date) return '-';

        const useCompany = options?.useCompanySettings === true;
        let momentFormat = useCompany
            ? momentFormatFromCompanyCode(resolveAppDateFormat())
            : DEFAULT_MOMENT_DATE_FORMAT;
        momentFormat += ' hh:mm A';

        const tz = useCompany ? appTimeZone() : 'UTC';
        return dayjs.utc(date).tz(tz).format(momentFormat);
    }

    /** Matches DateField `value-type` (MM/DD/YYYY) for v-model binding. */
    function normalizeDateForPicker(value) {
        if (value == null || value === '') {
            return '';
        }

        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return dayjs(raw, 'YYYY-MM-DD').format(DEFAULT_MOMENT_DATE_FORMAT);
        }

        return raw;
    }

    /** Converts DateField value to API/storage YYYY-MM-DD. */
    function formatDateForApi(value) {
        if (value == null || value === '') {
            return null;
        }

        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }

        const parsed = dayjs(raw, DEFAULT_MOMENT_DATE_FORMAT, true);
        if (parsed.isValid()) {
            return parsed.format('YYYY-MM-DD');
        }

        const fallback = dayjs(raw);
        return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null;
    }

    function makeTitleCase(str) {
        return str ? str[0].toUpperCase() + str.slice(1).toLowerCase() : '';
    }

    function filterByPermission(items) {
        return items.filter((item) => {
            const permissions = item.permission;
            if (permissions == null) {
                return true;
            } else if (Array.isArray(permissions)) {
                return permissions.some((permission) =>
                    ability.can(permission)
                );
            } else if (typeof permissions === 'string') {
                return ability.can(permissions);
            }
            return false;
        });
    }

    function filterFileFields(data, fileKeys = []) {
        const result = { ...data };
        for (const key of fileKeys) {
            if (!(result[key] && result[key].startsWith('data:'))) {
                delete result[key];
            }
        }
        return result;
    }

    function mapKeysToIds(item, keys) {
        if (!item) return {};
        const cloned = { ...item };
        keys.forEach((key) => {
            if (Array.isArray(cloned[key])) {
                cloned[key] = cloned[key].map((v) => String(v.id));
            }
        });
        return cloned;
    }

    function makeSlugToTitleCase(slug) {
        if (!slug) return '';
        return slug
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    /**
     * InputNumber prefix: symbol from Intl (e.g. USD → "$ ", INR → "₹ ").
     */
    function currencyInputPrefixFromCode(code) {
        let c = (code || 'USD').toUpperCase();
        try {
            Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: c
            }).format(0);
        } catch {
            c = 'USD';
        }
        const currencyPart = (display) => {
            try {
                const parts = Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: c,
                    currencyDisplay: display
                }).formatToParts(0);
                return parts.find((p) => p.type === 'currency')?.value ?? '';
            } catch {
                return '';
            }
        };
        let sym = currencyPart('narrowSymbol');
        if (!sym || /^[A-Z]{3}$/.test(sym)) {
            sym = currencyPart('symbol');
        }
        if (!sym || /^[A-Z]{3}$/.test(sym)) {
            return c === 'USD' ? '$ ' : `${c} `;
        }
        return `${sym} `;
    }

    function companyCurrencyInputPrefix() {
        return currencyInputPrefixFromCode('USD');
    }

    /**
     * @param {number} number
     * @param {boolean} showTrailingZeros
     * @param {string|null} currencyOverride ISO 4217
     */
    function moneyFormat(
        number,
        showTrailingZeros = true,
        currencyOverride = null
    ) {
        if (isNaN(number)) return '';

        let currency =
            currencyOverride != null && String(currencyOverride).trim() !== ''
                ? String(currencyOverride).trim().toUpperCase()
                : 'USD';

        try {
            Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
                0
            );
        } catch {
            currency = 'USD';
        }

        const ref = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        });
        const { maximumFractionDigits, minimumFractionDigits } =
            ref.resolvedOptions();
        const maxFD = maximumFractionDigits ?? 2;
        const minFD = showTrailingZeros
            ? maxFD
            : Math.min(minimumFractionDigits ?? 0, maxFD);

        return joinCurrencyPartsWithSpace(
            new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
                currencyDisplay: 'narrowSymbol',
                minimumFractionDigits: minFD,
                maximumFractionDigits: maxFD
            }),
            number
        );
    }

    function isValidUrl(value) {
        if (!value) return false;
        try {
            const u = new URL(value, window.location.origin);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function filterActiveWithSelected(categories, selectedId) {
        if (!categories?.length) return categories || [];
        const sel =
            selectedId != null && selectedId !== '' ? String(selectedId) : null;
        return categories.filter((c) => {
            if (c.status) return true;
            if (sel != null && String(c.id) === sel) return true;
            return false;
        });
    }

    function formatHours(hours) {
        const num = parseFloat(hours) || 0;
        return num.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatPercentage(value) {
        const num = parseFloat(value) || 0;
        return `${num.toFixed(2)}%`;
    }

    function mapVisibleColumns(fields, allColumns, fieldAliases = {}) {
        return fields
            .map((field) => {
                const mappedField = fieldAliases[field] ?? field;
                return allColumns.find((col) => col.field === mappedField);
            })
            .filter(Boolean);
    }

    function resolveVisibleColumns(selectedColumns, allColumns) {
        const required = allColumns.filter((c) => c.disabled);

        return allColumns.filter(
            (col) =>
                required.includes(col) ||
                selectedColumns.some((v) => v.field === col.field)
        );
    }

    function makeAddress(details) {
        if (!details) return '';
        const { address, city, state, country, zip } = details;
        return [address, zip, city, state, country].filter(Boolean).join(', ');
    }

    function formatMultiline(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    }

    function formatMarginDimensionLabel(key, breakdown) {
        if (key == null || key === '') {
            return '';
        }
        const k = String(key);
        if (
            !breakdown ||
            breakdown === 'none' ||
            breakdown === 'client' ||
            breakdown === 'employee'
        ) {
            return k;
        }

        try {
            if (breakdown === 'days') {
                return /^\d{4}-\d{2}-\d{2}$/.test(k) ? formatDate(k) : k;
            }
            if (breakdown === 'months') {
                if (/^\d{4}-\d{2}$/.test(k)) {
                    const d = dayjs.utc(`${k}-01`);
                    return d.isValid()
                        ? resolveAppDateFormat() === 'yy-mm-dd'
                            ? d.format('YYYY-MM')
                            : d.format('MM/YYYY')
                        : k;
                }
                return k;
            }
            if (breakdown === 'quarters') {
                const m = k.match(/^(\d{4})-Q([1-4])$/);
                return m
                    ? resolveAppDateFormat() === 'yy-mm-dd'
                        ? `${m[1]}-Q${m[2]}`
                        : `Q${m[2]} ${m[1]}`
                    : k;
            }
            if (breakdown === 'half_years') {
                const hy = k.match(/^(\d{4})-HY-([12])$/);
                return hy
                    ? resolveAppDateFormat() === 'yy-mm-dd'
                        ? `${hy[1]}-H${hy[2]}`
                        : `H${hy[2]} ${hy[1]}`
                    : k;
            }
            if (breakdown === 'years') {
                return /^\d{4}$/.test(k) ? k : k;
            }
            return k;
        } catch {
            return k;
        }
    }

    /** Mailgun ids: `<local@host>` → show `local` only */
    function formatMailgunMessageIdForDisplay(raw) {
        if (raw == null || String(raw).trim() === '') return '-';
        let s = String(raw).trim();
        if (s.startsWith('<')) s = s.slice(1);
        if (s.endsWith('>')) s = s.slice(0, -1);
        s = s.trim();
        const at = s.indexOf('@');
        if (at !== -1) s = s.slice(0, at);
        return s || '-';
    }

    return {
        unwrapTicketPayload,
        formatDate,
        formatDateTime,
        normalizeDateForPicker,
        formatDateForApi,
        moneyFormat,
        currencyInputPrefixFromCode,
        companyCurrencyInputPrefix,
        makeTitleCase,
        filterByPermission,
        filterFileFields,
        mapKeysToIds,
        makeSlugToTitleCase,
        isValidUrl,
        formatHours,
        formatPercentage,
        filterActiveWithSelected,
        mapVisibleColumns,
        resolveVisibleColumns,
        makeAddress,
        formatMultiline,
        formatMarginDimensionLabel,
        formatMailgunMessageIdForDisplay
    };
};
