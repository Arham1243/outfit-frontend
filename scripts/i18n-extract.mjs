#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import fg from 'fast-glob';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { baseParse, NodeTypes } from '@vue/compiler-dom';
import { parse as parseJS } from '@babel/parser';
import traverse from '@babel/traverse';

const ROOT = process.cwd();
const VUE_GLOB = 'src/**/*.vue';
const LOCALE_FILE = path.resolve(ROOT, 'src/i18n/locales/en.json');

const IGNORE_KEYS = new Set([
    'abilities',
    'access_token',
    'action_url',
    'additional_items_total',
    'additional_item_amount',
    'additional_item_label',
    'additional_notes',
    'address',
    'amount',
    'unbilled',
    'billed',
    'new',
    'approved',
    'submitted',
    'draft',
    'active',
    'inactive',
    'amount_received',
    'anniversary_date',
    'api_base_url',
    'applicable_roles',
    'applied_credits',
    'attachment',
    'attempts',
    'average_overhead_factor',
    'base_cost_per_hour',
    'batch',
    'bcc_recipients',
    'billable_amount',
    'billable_expenses',
    'billable_hours',
    'billed_on',
    'billing_cycle',
    'billing_rate',
    'billing_status',
    'browser',
    'budgeted_amount',
    'budgeted_hours',
    'budgeted_rate',
    'business_number',
    'button_text',
    'can_work_all_customers',
    'charge_amount',
    'charge_rate',
    'city',
    'code',
    'comment',
    'company_code',
    'company_name',
    'connection',
    'consolidate_invoices',
    'cost_rate',
    'country',
    'credit_card_amount',
    'credit_card_receipts_deposit_system_link',
    'currency',
    'currency_locked',
    'current_period_end',
    'current_period_start',
    'customer_default_travel_charge',
    'customer_notes',
    'customer_notes_print_on_invoice',
    'customer_po',
    'customer_proposal',
    'customer_rate',
    'dark_mode',
    'data',
    'date',
    'date_format',
    'days_out',
    'decimal_time',
    'default_credit_card_system_link',
    'default_expense_bank_system_link',
    'default_receipient',
    'default_markup',
    'default_timesheet_layout',
    'default_user_billing_rate_per_hour',
    'deposit_bank_system_link',
    'description',
    'detail_row_keys',
    'detail_row_labels',
    'device_fingerprint',
    'device_name',
    'difference_amount',
    'discount',
    'discount_yearly',
    'disk',
    'display_name',
    'domestic_invoice_notes',
    'due_date',
    'duration',
    'effective_cost_per_hour',
    'email',
    'email_delivery_failure_rate_percent',
    'email_delivery_status',
    'emergency_contact_email',
    'emergency_contact_name',
    'emergency_contact_phone',
    'employe_payment_status',
    'enabled',
    'endpoint',
    'entry_kind',
    'errors',
    'error_message',
    'event',
    'exception',
    'expense_report_liability_system_link',
    'failed',
    'failed_jobs',
    'failure_reason',
    'fax',
    'file_name',
    'file_path',
    'file_size',
    'first_invoice_date',
    'first_invoice_number',
    'first_name',
    'fixed_amount',
    'fixed_amount_label',
    'flag_name',
    'footer',
    'footer_html',
    'force_uom_entry',
    'frequency',
    'from',
    'from_status',
    'gateway',
    'generate_and_send',
    'greeting',
    'guard_name',
    'half_year',
    'handler',
    'has_customer_rate',
    'has_fixed_amount',
    'id',
    'input_hours',
    'international_invoice_notes',
    'intro_html',
    'invoice_date',
    'invoice_number',
    'invoice_reminders',
    'ip_address',
    'item_refrence',
    'key',
    'last_name',
    'last_run_duration',
    'last_run_status',
    'last_sync_hash',
    'legal_name',
    'limit_count',
    'logo',
    'logo_size',
    'logo_url',
    'log_name',
    'mailgun_api_key',
    'mailgun_domain',
    'mailgun_events_snapshot',
    'mailgun_last_event_ts',
    'mailgun_send_message',
    'mailgun_severity',
    'margin_rate',
    'marketing',
    'message',
    'metadata',
    'migration',
    'minimum_minutes',
    'minimum_time_charge',
    'module',
    'module_name',
    'month',
    'monthly_fee_amount',
    'monthly_fee_label',
    'next_billing_date',
    'non_billable_amount',
    'note',
    'notes',
    'number',
    'onboarding_step',
    'options',
    'order',
    'original_billable_amount',
    'original_charge_rate',
    'original_filename',
    'original_reference_number',
    'otp_code',
    'output',
    'outstanding_balance',
    'password',
    'payload',
    'payment_applied',
    'payment_date',
    'payment_metadata',
    'payment_provider',
    'payment_status',
    'pdf_path',
    'pending_jobs',
    'perks',
    'phone',
    'platform',
    'preferences',
    'prepayment_invoice_system_link',
    'preview_multiple_path',
    'preview_path',
    'price',
    'price_yearly',
    'print_on_invoice',
    'print_payment_link',
    'priority',
    'profile_image',
    'project_details',
    'project_task_rate',
    'properties',
    'provider',
    'pulled_failed',
    'pulled_synced',
    'pulled_total',
    'pushed_failed',
    'pushed_synced',
    'pushed_total',
    'qbo_connected',
    'qbo_enabled',
    'qbo_entity',
    'quarter',
    'queue',
    'rating',
    'receipt_date',
    'recipient',
    'recurring_ends_on',
    'reference_number',
    'refresh_token',
    'region_code',
    'repeat_on',
    'reply_to_email',
    'reply_to_name',
    'resource',
    'retainer_amount',
    'retainer_label',
    'returned_description',
    'returned_payment_expense_system_link',
    'secondary_email',
    'secondary_phone',
    'session_token',
    'short_name',
    'slug',
    'sort_order',
    'source',
    'standard_employee_overhead_percent',
    'start_date',
    'state',
    'status',
    'stored_filename',
    'street_address_1',
    'street_address_2',
    'subject',
    'subject_template',
    'synced',
    'sync_status',
    'system',
    'system_link',
    'table_key',
    'template_path',
    'template_slug',
    'ticket_number',
    'ticket_sequence',
    'tier_key',
    'timesheet_expense_description_optional',
    'timesheet_layout',
    'timesheet_start',
    'timesheet_time_format',
    'timezone',
    'title',
    'token',
    'token_config_key',
    'total',
    'total_amount',
    'total_billable',
    'total_cost',
    'total_jobs',
    'to_status',
    'travel_charges',
    'trial_days',
    'type',
    'uom_cost_rate',
    'uom_miles',
    'uom_sale_price',
    'user_agent',
    'user_name',
    'weekly_timesheet_date_format',
    'week_begins',
    'year',
    'zip'
]);

const UI_NAME_RE =
    /(label|title|text|message|placeholder|description|caption|empty|nodata|noData|confirm|cancel|success|error|warning|hint|tooltip|status|button|btn)$/i;

function parseArg(name, fallback = null) {
    const prefix = `--${name}=`;
    const arg = process.argv.find((a) => a.startsWith(prefix));
    if (!arg) return fallback;
    return arg.slice(prefix.length);
}

const dryRun = process.argv.includes('--dry-run');

function readJsonSafe(file) {
    return fs
        .readFile(file, 'utf8')
        .then((txt) => JSON.parse(txt))
        .catch(() => ({}));
}

function shouldIgnoreText(text) {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (/\{\{[^}]+\}\}/.test(trimmed)) return true;
    if (/^[\W_]+$/.test(trimmed)) return true;
    if (trimmed.length <= 1) return true;
    return false;
}
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/['"]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function shortHash(text) {
    return crypto.createHash('sha1').update(text).digest('hex').slice(0, 6);
}

function makeKey(text, usedKeys) {
    const base = slugify(text) || 'text';
    let key = base;

    if (usedKeys.has(key)) {
        key = `${base}_${shortHash(text)}`;
    }

    while (usedKeys.has(key)) {
        key = `${base}_${shortHash(text + key)}`;
    }

    usedKeys.add(key);
    return key;
}

function applyReplacements(source, replacements) {
    const sorted = [...replacements].sort((a, b) => b.start - a.start);
    let out = source;
    for (const r of sorted) {
        out = out.slice(0, r.start) + r.replacement + out.slice(r.end);
    }
    return out;
}

function isUiName(name) {
    return UI_NAME_RE.test(name);
}

function getUiContextName(pathNode) {
    let p = pathNode.parentPath;
    while (p) {
        if (
            p.isVariableDeclarator() &&
            p.node.id &&
            p.node.id.type === 'Identifier'
        ) {
            return p.node.id.name;
        }
        if (
            p.isAssignmentExpression() &&
            p.node.left &&
            p.node.left.type === 'Identifier'
        ) {
            return p.node.left.name;
        }
        if (p.isObjectProperty()) {
            const key = p.node.key;
            if (key.type === 'Identifier') return key.name;
            if (key.type === 'StringLiteral') return key.value;
        }
        if (
            p.isReturnStatement() ||
            p.isCallExpression() ||
            p.isImportDeclaration()
        ) {
            break;
        }
        p = p.parentPath;
    }
    return null;
}

function shouldSkipStringLiteral(pathNode) {
    if (
        pathNode.parentPath?.isBinaryExpression() &&
        ['===', '!==', '==', '!='].includes(pathNode.parent.operator)
    ) {
        return true;
    }

    if (
        pathNode.findParent(
            (p) => p.isImportDeclaration() || p.isExportDeclaration()
        )
    )
        return true;
    if (
        pathNode.findParent(
            (p) =>
                p.isCallExpression() &&
                p.node.callee?.object?.name === 'console'
        )
    )
        return true;
    if (pathNode.parentPath?.isObjectProperty() && pathNode.parentKey === 'key')
        return true;
    if (
        pathNode.parentPath?.isMemberExpression() &&
        pathNode.parentKey === 'property' &&
        !pathNode.parent.computed
    )
        return true;
    return false;
}

function getOrCreateKey(text, textToKey, usedKeys) {
    if (textToKey.has(text)) return textToKey.get(text);
    const key = makeKey(text, usedKeys);
    textToKey.set(text, key);
    return key;
}

function inferParamName(expr) {
    const code = expr.replace(/\?\./g, '.');

    // Call expression — derive name from the callee
    const calleeMatch = code.match(/^([a-zA-Z_$][\w$]*)\s*\(/);
    if (calleeMatch) {
        const name = calleeMatch[1]
            .replace(/^get/, '')
            .replace(/^[A-Z]/, (c) => c.toLowerCase());
        return name || 'value';
    }

    const match = code.match(/([a-zA-Z0-9_]+)(?:\.[a-zA-Z0-9_]+)*$/);
    if (!match) return 'value';

    const last = match[0].split('.').pop();

    if (/name/i.test(last)) return 'name';
    if (/title/i.test(last)) return 'title';
    if (/status/i.test(last)) return 'status';
    if (/label/i.test(last)) return 'label';
    if (/item/i.test(last)) return 'item';
    if (/selected/i.test(last)) return 'selected';

    return last || 'value';
}

function transformVueExpression(code, textToKey, usedKeys) {
    let ast;
    try {
        ast = parseJS(code, {
            sourceType: 'module'
        });
    } catch (e) {
        return code;
    }
    function walk(node) {
        if (!node) return '';

        // STRING LITERAL → translate
        if (node.type === 'StringLiteral') {
            const val = node.value;

            // ignore ternary extracted literals
            const SKIP_WORDS = new Set(['active', 'inactive', 'true', 'false']);

            if (SKIP_WORDS.has(val.trim().toLowerCase())) {
                return `'${val}'`;
            }

            const key = getOrCreateKey(val, textToKey, usedKeys);
            return `$t('${key}')`;
        }

        // CONDITIONAL (ternary)
        if (node.type === 'ConditionalExpression') {
            return `(${walk(node.test)}) ? (${walk(node.consequent)}) : (${walk(node.alternate)})`;
        }

        // TEMPLATE LITERAL (THIS FIXES YOUR BUG)
        if (node.type === 'TemplateLiteral') {
            // plain template string
            if (node.expressions.length === 0) {
                const text = node.quasis[0]?.value?.cooked?.trim();

                if (!text) {
                    return code.slice(node.start, node.end);
                }

                const key = getOrCreateKey(text, textToKey, usedKeys);

                return `$t('${key}')`;
            }
            // Only support one interpolation for now
            if (node.expressions.length !== 1) {
                return code.slice(node.start, node.end);
            }

            const prefix = node.quasis[0]?.value?.cooked ?? '';
            const suffix = node.quasis[1]?.value?.cooked ?? '';

            const expr = node.expressions[0];
            const exprCode = code.slice(expr.start, expr.end);

            const paramName = inferParamName(exprCode);

            const translationText = `${prefix}{${paramName}}${suffix}`
                .replace(/\s+/g, ' ')
                .trim();

            const key = getOrCreateKey(translationText, textToKey, usedKeys);

            return `$t('${key}', { ${paramName}: ${exprCode} })`;
        }

        // fallback
        if (node?.start != null && node?.end != null) {
            return code.slice(node.start, node.end);
        }
        return code;
    }

    const parsed = ast.program.body[0]?.expression;
    return walk(parsed);
}

function extractTemplate(templateSource, baseOffset, textToKey, usedKeys) {
    const ast = baseParse(templateSource);
    const replacements = [];

    const ALLOWED_ATTRS = new Set([
        'header',
        'title',
        'label',
        'placeholder',
        'content',
        'description',
        'message',
        'caption',
        'tooltip',
        'confirmButtonText',
        'cancelButtonText',
        'acceptLabel',
        'rejectLabel'
    ]);

    function walk(node) {
        if (node.type === NodeTypes.TEXT) {
            const raw = node.content;
            const trimmed = raw.trim();

            if (!trimmed || shouldIgnoreText(trimmed)) return;

            const key = getOrCreateKey(
                trimmed.replace(/\s+/g, ' '),
                textToKey,
                usedKeys
            );

            const leading = raw.match(/^\s*/)?.[0] ?? '';
            const trailing = raw.match(/\s*$/)?.[0] ?? '';

            replacements.push({
                start: baseOffset + node.loc.start.offset,
                end: baseOffset + node.loc.end.offset,
                replacement: `${leading}{{ $t('${key}') }}${trailing}`
            });
        }

        if (node.type === NodeTypes.ELEMENT) {
            for (const prop of node.props || []) {
                if (
                    prop.type !== NodeTypes.ATTRIBUTE &&
                    prop.type !== NodeTypes.DIRECTIVE
                )
                    continue;

                const attrName =
                    prop.type === NodeTypes.ATTRIBUTE
                        ? prop.name
                        : prop.arg?.content || prop.arg?.name;

                if (!attrName) continue;
                if (IGNORE_KEYS.has(attrName)) continue;
                if (!ALLOWED_ATTRS.has(attrName)) continue;

                // -------------------------
                // STATIC ATTRIBUTES
                // -------------------------
                if (prop.type === NodeTypes.ATTRIBUTE) {
                    const value =
                        prop.value?.content ?? prop.value?.loc?.source ?? '';

                    if (!value || shouldIgnoreText(value)) continue;

                    const normalized = value.replace(/\s+/g, ' ').trim();

                    const key = getOrCreateKey(normalized, textToKey, usedKeys);

                    // if it's inside plain attribute, convert to v-bind safely
                    const FORCE_BIND_ATTRS = new Set([
                        'content',
                        'header',
                        'title',
                        'label',
                        'placeholder',
                        'description',
                        'message',
                        'caption',
                        'tooltip',
                        'confirmButtonText',
                        'cancelButtonText',
                        'acceptLabel',
                        'rejectLabel'
                    ]);

                    const shouldBind = FORCE_BIND_ATTRS.has(attrName);
                    replacements.push({
                        start: baseOffset + prop.loc.start.offset,
                        end: baseOffset + prop.loc.end.offset,
                        replacement: shouldBind
                            ? `:${attrName}="$t('${key}')"`
                            : `${attrName}="$t('${key}')"`
                    });

                    continue;
                }

                // -------------------------
                // DYNAMIC BINDINGS
                // -------------------------
                if (prop.type === NodeTypes.DIRECTIVE && prop.exp?.content) {
                    const exp = prop.exp.content.trim();

                    if (!exp) continue;

                    if (exp.includes('$t(')) continue;

                    // -----------------------------
                    // 1. HANDLE TEMPLATE STRING (BACKTICKS NOT RELIABLE IN AST)
                    // -----------------------------
                    const rawExp = templateSource.slice(
                        prop.exp.loc.start.offset,
                        prop.exp.loc.end.offset
                    );

                    const isTemplateLiteral =
                        prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION &&
                        /\$\{/.test(rawExp);

                    if (isTemplateLiteral) {
                        const raw = templateSource.slice(
                            prop.exp.loc.start.offset,
                            prop.exp.loc.end.offset
                        );

                        const inner = raw.replace(/^`|`$/g, '');

                        const parts = [];
                        const vars = [];

                        const regex = /\$\{([^}]+)\}/g;
                        let lastIndex = 0;
                        let match;

                        while ((match = regex.exec(inner))) {
                            const staticText = inner.slice(
                                lastIndex,
                                match.index
                            );

                            if (staticText.trim()) {
                                parts.push(staticText);
                            }

                            let expr = match[1].trim();
                            const placeholder = inferParamName(expr);

                            parts.push(`{${placeholder}}`);
                            vars.push(`${placeholder}: ${expr}`);

                            lastIndex = match.index + match[0].length;
                        }

                        const tail = inner.slice(lastIndex);
                        if (tail.trim()) parts.push(tail);

                        const finalText = parts
                            .join(' ')
                            .replace(/\s+/g, ' ')
                            .trim();

                        const key = getOrCreateKey(
                            finalText,
                            textToKey,
                            usedKeys
                        );

                        const params = vars.length
                            ? `, { ${vars.join(', ')} }`
                            : '';

                        replacements.push({
                            start: baseOffset + prop.loc.start.offset,
                            end: baseOffset + prop.loc.end.offset,
                            replacement: `:${attrName}="$t('${key}'${params})"`
                        });

                        continue;
                    }

                    // -----------------------------
                    // 2. NORMAL EXPRESSION
                    // -----------------------------
                    const rebuilt = transformVueExpression(
                        exp,
                        textToKey,
                        usedKeys
                    );

                    replacements.push({
                        start: baseOffset + prop.loc.start.offset,
                        end: baseOffset + prop.loc.end.offset,
                        replacement: `:${attrName}="${rebuilt}"`
                    });

                    continue;
                }
            }
        }

        for (const child of node.children || []) {
            walk(child);
        }
    }

    walk(ast);
    return replacements;
}

function extractScript(
    scriptSource,
    baseOffset,
    fileHasSetupScript,
    textToKey,
    usedKeys
) {
    const replacements = [];
    const callName = '$t';
    const ast = parseJS(scriptSource, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'topLevelAwait', 'decorators-legacy']
    });

    traverse(ast, {
        StringLiteral(pathNode) {
            try {
                if (shouldSkipStringLiteral(pathNode)) return;

                if (
                    pathNode.findParent(
                        (p) =>
                            p.isCallExpression() &&
                            (p.node.callee?.name === '$t' ||
                                p.node.callee?.property?.name === '$t')
                    )
                )
                    return;

                const value = pathNode.node.value;
                if (!value || !value.trim()) return;
                if (shouldIgnoreText(value)) return;

                const parent = pathNode.parentPath;
                if (parent?.isObjectProperty()) {
                    const keyName = parent.node.key?.name;
                    if (!isUiName(keyName)) return;
                    if (IGNORE_KEYS.has(keyName) && keyName !== 'label') return;
                } else {
                    const ctx = getUiContextName(pathNode);
                    if (
                        !ctx ||
                        !isUiName(ctx) ||
                        (IGNORE_KEYS.has(ctx) && ctx !== 'label') ||
                        /form|modal|dialog|column|table|menu|config/i.test(ctx)
                    )
                        return;
                }

                const key = getOrCreateKey(
                    value.trim().replace(/\s+/g, ' '),
                    textToKey,
                    usedKeys
                );

                replacements.push({
                    start: baseOffset + pathNode.node.start,
                    end: baseOffset + pathNode.node.end,
                    replacement: `${callName}('${key}')`
                });
            } catch {
                return;
            }
        },

        CallExpression(pathNode) {
            const callee = pathNode.node.callee;

            const isDirectT =
                callee.type === 'Identifier' && callee.name === '$t';

            const isMemberT =
                callee.type === 'MemberExpression' &&
                callee.property?.name === '$t';

            if (!isDirectT && !isMemberT) return;

            const args = pathNode.node.arguments;
            const keyArg = args[0];

            if (!keyArg || keyArg.type !== 'StringLiteral') return;

            getOrCreateKey(keyArg.value, textToKey, usedKeys);
        }
    });

    return replacements;
}

async function processVueFile(file, textToKey, usedKeys, enJson) {
    const source = await fs.readFile(file, 'utf8');
    const sfc = parseSFC(source, { filename: file });

    const replacements = [];

    if (sfc.descriptor.template) {
        const tplStart = sfc.descriptor.template.loc.start.offset;
        replacements.push(
            ...extractTemplate(
                sfc.descriptor.template.content,
                tplStart,
                textToKey,
                usedKeys
            )
        );
    }

    const hasSetup = Boolean(sfc.descriptor.scriptSetup);

    if (sfc.descriptor.script) {
        const scriptStart = sfc.descriptor.script.loc.start.offset;
        replacements.push(
            ...extractScript(
                sfc.descriptor.script.content,
                scriptStart,
                hasSetup,
                textToKey,
                usedKeys
            )
        );
    }

    if (sfc.descriptor.scriptSetup) {
        const setupStart = sfc.descriptor.scriptSetup.loc.start.offset;
        replacements.push(
            ...extractScript(
                sfc.descriptor.scriptSetup.content,
                setupStart,
                true,
                textToKey,
                usedKeys
            )
        );
    }

    if (replacements.length === 0) {
        return { file, changed: false };
    }

    const nextSource = applyReplacements(source, replacements);

    if (nextSource !== source) {
        if (!dryRun) {
            await fs.writeFile(file, nextSource, 'utf8');
        }
        return { file, changed: true };
    }

    return { file, changed: false };
}

async function main() {
    const enData = await readJsonSafe(LOCALE_FILE);
    const textToKey = new Map();
    const usedKeys = new Set(Object.keys(enData));

    for (const [key, val] of Object.entries(enData)) {
        if (typeof val === 'string') {
            textToKey.set(val, key);
        }
    }

    const files = await fg(VUE_GLOB, { cwd: ROOT, absolute: true });
    let changedFiles = 0;
    let newKeys = 0;

    for (const file of files) {
        const beforeSize = textToKey.size;
        const result = await processVueFile(file, textToKey, usedKeys, enData);
        if (result.changed) changedFiles += 1;
        newKeys += Math.max(0, textToKey.size - beforeSize);
    }

    const nextEn = { ...enData };
    for (const [text, key] of textToKey.entries()) {
        if (!(key in nextEn)) {
            nextEn[key] = text;
        }
    }

    if (JSON.stringify(nextEn, null, 2) !== JSON.stringify(enData, null, 2)) {
        if (!dryRun) {
            await fs.mkdir(path.dirname(LOCALE_FILE), { recursive: true });
            await fs.writeFile(
                LOCALE_FILE,
                `${JSON.stringify(nextEn, null, 2)}\n`,
                'utf8'
            );
        }
    }

    console.log(
        dryRun
            ? `[dry-run] scanned ${files.length} files, would change ${changedFiles} files, add ${Math.max(0, textToKey.size - Object.keys(enData).length)} keys`
            : `Done. Scanned ${files.length} files, changed ${changedFiles} files.`
    );
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
