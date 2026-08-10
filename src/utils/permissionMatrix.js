/**
 * Canonical order and grouping for permission matrices (roles, users, profile).
 * Matches product navigation order in src/static/menuItems.json.
 */

/** Broad legacy keys hidden from the matrix UI (granular keys are used instead). */
const SKIP_ENTITIES = new Set(['core']);

const ALL_ACTIONS = ['view', 'create', 'edit', 'delete'];

/** Enabling any of these implies view; disabling view clears these. */
const ACTIONS_IMPLYING_VIEW = ['create', 'edit', 'delete'];

/**
 * Which actions apply per entity (must stay aligned with backend config/permission_matrix.php).
 * Non-applicable actions are null (hidden in the matrix).
 */
export const ENTITY_APPLICABLE_ACTIONS = {
    'core.wardrobe': ['view', 'create', 'edit', 'delete'],
    'core.outfits': ['view', 'create']
};

/** Not shown in the tenant role permissions matrix. */
const EXCLUDED_ENTITIES = new Set([]);

export function applicableActionsFor(entity) {
    return ENTITY_APPLICABLE_ACTIONS[entity] ?? ALL_ACTIONS;
}

export function isApplicableAction(entity, action) {
    return applicableActionsFor(entity).includes(action);
}

function isEditableAction(entity, action, actions, hiddenActions = []) {
    if (hiddenActions.includes(action)) {
        return false;
    }
    if (!isApplicableAction(entity, action)) {
        return false;
    }
    return actions[action] !== null && actions[action] !== undefined;
}

/**
 * Create / edit / delete require view. Clearing view clears the others.
 *
 * @param {string} entity
 * @param {Record<string, boolean|null>} actions
 * @param {{ hiddenActions?: string[] }} [options]
 */
export function applyPermissionDependencies(entity, actions, options = {}) {
    if (!actions || typeof actions !== 'object') {
        return;
    }

    const hiddenActions = options.hiddenActions ?? [];

    if (
        isEditableAction(entity, 'view', actions, hiddenActions) &&
        ACTIONS_IMPLYING_VIEW.some(
            (action) =>
                isEditableAction(entity, action, actions, hiddenActions) &&
                actions[action] === true
        )
    ) {
        actions.view = true;
    }

    if (
        isEditableAction(entity, 'view', actions, hiddenActions) &&
        actions.view === false
    ) {
        ACTIONS_IMPLYING_VIEW.forEach((action) => {
            if (isEditableAction(entity, action, actions, hiddenActions)) {
                actions[action] = false;
            }
        });
    }
}

/**
 * View must stay checked while any create / edit / delete is enabled
 * (and only when those actions actually apply to this entity).
 *
 * @param {string} entity
 * @param {Record<string, boolean|null>} actions
 * @returns {boolean}
 */
export function isViewLockedByDependencies(entity, actions) {
    if (!actions || typeof actions !== 'object') {
        return false;
    }
    if (!isApplicableAction(entity, 'view')) {
        return false;
    }
    return ACTIONS_IMPLYING_VIEW.some(
        (action) =>
            isApplicableAction(entity, action) && actions[action] === true
    );
}

/** @param {Record<string, Record<string, boolean|null>>} matrix */
export function applyMatrixDependencies(matrix, hiddenActionsByEntity = {}) {
    if (!matrix || typeof matrix !== 'object') {
        return;
    }
    Object.entries(matrix).forEach(([entity, actions]) => {
        applyPermissionDependencies(entity, actions, {
            hiddenActions: hiddenActionsByEntity[entity] ?? []
        });
    });
}

/** @param {Record<string, Record<string, boolean|null>>} matrix */
export function normalizePermissionMatrix(matrix) {
    if (!matrix || typeof matrix !== 'object') {
        return {};
    }
    const out = { ...matrix };
    Object.keys(out).forEach((entity) => {
        if (SKIP_ENTITIES.has(entity) || EXCLUDED_ENTITIES.has(entity)) {
            delete out[entity];
            return;
        }
        const actions = { ...out[entity] };
        ALL_ACTIONS.forEach((action) => {
            if (!isApplicableAction(entity, action)) {
                actions[action] = null;
            }
        });
        out[entity] = actions;
    });
    applyMatrixDependencies(out);
    return out;
}

/** Display labels that would otherwise be wrong or too long (i18n key paths). */
const ENTITY_LABEL_OVERRIDES = {
    'core.wardrobe': 'menu.wardrobe',
    'core.outfits': 'menu.outfits'
};

/** Maps section heading label → preset toolbar key (inline switches on that header row). */
export const SECTION_HEADER_PRESET_KEYS = {
    Core: 'core'
};

export const PERMISSION_MATRIX_SECTIONS = [
    {
        title: 'Core',
        entities: ['core.wardrobe', 'core.outfits'],
        childIndent: false
    }
];

function capitalizeWords(str) {
    return str
        .split(/[\s.]+/)
        .filter(Boolean)
        .map((w) =>
            w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''
        )
        .join(' ');
}

export function permissionLabel(entity) {
    if (ENTITY_LABEL_OVERRIDES[entity]) {
        const key = ENTITY_LABEL_OVERRIDES[entity];
        if (typeof globalThis.$t === 'function') {
            return globalThis.$t(key);
        }
        return key;
    }
    if (entity.startsWith('core.')) {
        return capitalizeWords(entity.slice('core.'.length).replace(/-/g, ' '));
    }
    return capitalizeWords(
        entity.replace(/\./g, ' ').replace(/-/g, ' ').replace(/_/g, ' ')
    );
}

export function permissionMatrixRowClass(data) {
    return data.isGroupHeader
        ? 'permission-matrix-group-header bg-surface-100 dark:bg-surface-800'
        : '';
}

/** Granular report entities (excludes legacy top-level `reports`). */
export function isReportsSectionEntity(entity) {
    return entity !== 'reports' && entity.startsWith('reports.');
}

/** Granular core entities (excludes legacy top-level `core`). */
export function isCoreSectionEntity(entity) {
    return entity !== 'core' && entity.startsWith('core.');
}

/** Invoicing module entities (e.g. invoicing.create, invoicing.approve). */
export function isInvoicingSectionEntity(entity) {
    return entity.startsWith('invoicing.');
}

/** Approvals sub-entities (timesheets, expenses). */
export function isApprovalsSectionEntity(entity) {
    return entity === 'approvals.timesheets' || entity === 'approvals.expenses';
}

/**
 * Derive View only / Full access toggle state from current checkbox values.
 * Full access: every non-null permission in scope is true.
 * View only: every non-null permission matches view=true, other actions=false.
 */
export function computeSectionPresetSwitches(
    selectedPermissions,
    rolePermissions,
    entityFilter
) {
    let viewOnlyMatch = true;
    let fullMatch = true;
    let hasEditable = false;

    Object.keys(selectedPermissions || {}).forEach((entity) => {
        if (!entityFilter(entity)) {
            return;
        }
        const tmpl = rolePermissions[entity];
        const sel = selectedPermissions[entity];
        if (!tmpl || !sel) {
            return;
        }
        Object.keys(tmpl).forEach((action) => {
            if (!Object.prototype.hasOwnProperty.call(sel, action)) {
                return;
            }
            if (sel[action] === null) {
                return;
            }
            hasEditable = true;
            if (sel[action] !== true) {
                fullMatch = false;
            }
            const matchesViewOnlyCell =
                action === 'view'
                    ? sel[action] === true
                    : sel[action] === false;
            if (!matchesViewOnlyCell) {
                viewOnlyMatch = false;
            }
        });
    });

    if (!hasEditable) {
        return { viewOnly: false, fullAdmin: false };
    }
    if (fullMatch) {
        return { viewOnly: false, fullAdmin: true };
    }
    if (viewOnlyMatch) {
        return { viewOnly: true, fullAdmin: false };
    }
    return { viewOnly: false, fullAdmin: false };
}

/**
 * Apply a preset to all entities matching `entityFilter` in `selectedPermissions`.
 * Uses `rolePermissions` to know which actions exist per entity.
 *
 * @param {'view-only'|'full'|'clear'} preset - `clear` sets all editable actions to false.
 */
export function applyPermissionSectionPreset(
    selectedPermissions,
    rolePermissions,
    entityFilter,
    preset
) {
    if (!selectedPermissions || !rolePermissions) {
        return;
    }
    Object.keys(selectedPermissions).forEach((entity) => {
        if (!entityFilter(entity)) {
            return;
        }
        const tmpl = rolePermissions[entity];
        const sel = selectedPermissions[entity];
        if (!tmpl || !sel) {
            return;
        }
        Object.keys(tmpl).forEach((action) => {
            if (!Object.prototype.hasOwnProperty.call(sel, action)) {
                return;
            }
            if (sel[action] === null) {
                return;
            }
            if (preset === 'view-only') {
                sel[action] = action === 'view';
            } else if (preset === 'full') {
                sel[action] = true;
            } else if (preset === 'clear') {
                sel[action] = false;
            }
        });
        applyPermissionDependencies(entity, sel);
    });
}

/**
 * @param {Record<string, Record<string, boolean|null>>} rolePermissions
 * @param {Record<string, Record<string, boolean|null>>} selectedPermissions
 * @returns {Array<Record<string, unknown>>}
 */
export function buildPermissionMatrixRows(
    rolePermissions,
    selectedPermissions
) {
    const matrix =
        rolePermissions && typeof rolePermissions === 'object'
            ? rolePermissions
            : {};
    const selected =
        selectedPermissions && typeof selectedPermissions === 'object'
            ? selectedPermissions
            : {};
    const used = new Set();
    const rows = [];

    const tryPushRow = (entity, indent, extra = {}) => {
        if (
            !matrix[entity] ||
            SKIP_ENTITIES.has(entity) ||
            EXCLUDED_ENTITIES.has(entity)
        ) {
            return;
        }
        used.add(entity);
        const perms = matrix[entity];
        const sel = selected[entity] || {};
        const row = {
            entity,
            isGroupHeader: false,
            indent,
            ...extra
        };
        ALL_ACTIONS.forEach((action) => {
            if (!isApplicableAction(entity, action)) {
                row[action] = null;
                return;
            }
            row[action] = Object.prototype.hasOwnProperty.call(sel, action)
                ? sel[action]
                : false;
        });
        row.viewLocked = isViewLockedByDependencies(entity, row);
        rows.push(row);
    };

    for (const section of PERMISSION_MATRIX_SECTIONS) {
        const sectionEntities = section.entities.filter(
            (e) =>
                matrix[e] && !SKIP_ENTITIES.has(e) && !EXCLUDED_ENTITIES.has(e)
        );
        if (sectionEntities.length === 0) {
            continue;
        }

        const presetSectionKey =
            SECTION_HEADER_PRESET_KEYS[section.title] ?? null;
        const isSingleEntitySection = sectionEntities.length === 1;

        if (section.title && !isSingleEntitySection) {
            rows.push({
                isGroupHeader: true,
                groupTitle: section.title,
                presetSectionKey
            });
        }

        for (const entity of section.entities) {
            if (!sectionEntities.includes(entity)) {
                continue;
            }
            const rowExtra =
                isSingleEntitySection && section.title
                    ? { isSectionLead: true }
                    : {};
            tryPushRow(entity, section.childIndent, rowExtra);
        }
    }

    const rest = Object.keys(matrix).filter(
        (e) =>
            !used.has(e) && !SKIP_ENTITIES.has(e) && !EXCLUDED_ENTITIES.has(e)
    );
    rest.sort((a, b) => permissionLabel(a).localeCompare(permissionLabel(b)));
    for (const entity of rest) {
        tryPushRow(entity, false);
    }

    return rows;
}
