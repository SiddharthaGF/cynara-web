function collectFields(fields, acc = []) {
    for (const field of fields) {
        acc.push(field);
        if (field.items) {
            collectFields(field.items, acc);
        }
    }
    return acc;
}
function isEmpty(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === "number" && !Number.isFinite(value))
        return true;
    if (typeof value === "string")
        return value.length === 0;
    if (Array.isArray(value))
        return value.length === 0;
    return false;
}
function toBoolean(value) {
    if (typeof value === "boolean")
        return value;
    if (value === null || value === undefined)
        return false;
    if (typeof value === "string")
        return value.length > 0;
    if (typeof value === "number")
        return value !== 0;
    return true;
}
function toNumber(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === "number")
        return value;
    return Number(value);
}
function compareValues(left, right) {
    if (left === null || left === undefined || right === null || right === undefined) {
        if (left === right)
            return 0;
        return left === null || left === undefined ? -1 : 1;
    }
    if (typeof left === "string" && typeof right === "string") {
        return left.localeCompare(right);
    }
    return toNumber(left) - toNumber(right);
}
function evaluateExpression(expression, values) {
    if ("ref" in expression) {
        return Object.prototype.hasOwnProperty.call(values, expression.ref) ? values[expression.ref] : null;
    }
    if ("lit" in expression) {
        return expression.lit;
    }
    const args = expression.args.map((arg) => evaluateExpression(arg, values));
    switch (expression.op) {
        case "eq":
            return compareValues(args[0], args[1]) === 0;
        case "neq":
            return compareValues(args[0], args[1]) !== 0;
        case "gt":
            return compareValues(args[0], args[1]) > 0;
        case "gte":
            return compareValues(args[0], args[1]) >= 0;
        case "lt":
            return compareValues(args[0], args[1]) < 0;
        case "lte":
            return compareValues(args[0], args[1]) <= 0;
        case "and":
            return args.every((value) => toBoolean(value));
        case "or":
            return args.some((value) => toBoolean(value));
        case "not":
            return !toBoolean(args[0]);
        case "empty":
            return isEmpty(args[0]);
        case "coalesce":
            return args.find((value) => !isEmpty(value)) ?? null;
        case "add":
            return arithmetic(args[0], args[1], (left, right) => left + right);
        case "sub":
            return arithmetic(args[0], args[1], (left, right) => left - right);
        case "mul":
            return arithmetic(args[0], args[1], (left, right) => left * right);
        case "div":
            return arithmetic(args[0], args[1], (left, right) => left / right);
        default:
            throw new Error(`Unsupported expression operator '${expression.op}'.`);
    }
}
/** Returns null when either operand is unset or the result is non-finite (e.g. 0/0 → NaN). */
function arithmetic(left, right, compute) {
    if (isEmpty(left) || isEmpty(right)) {
        return null;
    }
    const result = compute(toNumber(left), toNumber(right));
    return Number.isFinite(result) ? result : null;
}
function analyzeCalculationOrder(clinicalFields, rules) {
    const byId = new Map(clinicalFields.map((field) => [field.id, field]));
    const calculatedIds = Object.entries(rules.fields ?? {})
        .filter(([, fieldRules]) => fieldRules.calculate)
        .map(([fieldId]) => fieldId)
        .filter((fieldId) => byId.has(fieldId));
    const dependencies = new Map();
    for (const fieldId of calculatedIds) {
        const field = byId.get(fieldId);
        const refs = collectReferences(rules.fields[fieldId].calculate);
        dependencies.set(fieldId, new Set([...refs]
            .map((code) => clinicalFields.find((item) => item.code === code)?.id)
            .filter((id) => Boolean(id))));
    }
    const inDegree = new Map(calculatedIds.map((id) => [id, 0]));
    for (const fieldId of calculatedIds) {
        for (const dependencyId of dependencies.get(fieldId) ?? []) {
            if (inDegree.has(dependencyId)) {
                inDegree.set(fieldId, (inDegree.get(fieldId) ?? 0) + 1);
            }
        }
    }
    const queue = calculatedIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
    const order = [];
    while (queue.length > 0) {
        const current = queue.shift();
        order.push(current);
        for (const fieldId of calculatedIds) {
            if (!(dependencies.get(fieldId)?.has(current)))
                continue;
            inDegree.set(fieldId, (inDegree.get(fieldId) ?? 0) - 1);
            if (inDegree.get(fieldId) === 0)
                queue.push(fieldId);
        }
    }
    return order;
}
function collectReferences(expression) {
    const refs = new Set();
    if ("ref" in expression) {
        refs.add(expression.ref);
        return refs;
    }
    if ("args" in expression) {
        for (const arg of expression.args) {
            for (const ref of collectReferences(arg))
                refs.add(ref);
        }
    }
    return refs;
}
const MAX_STEP_DECIMALS = 10;
function decimalPlacesFromStep(step) {
    if (!Number.isFinite(step) || step <= 0)
        return 0;
    let decimals = 0;
    let scaled = step;
    while (decimals < 10 && Math.abs(Math.round(scaled) - scaled) > 1e-9) {
        scaled *= 10;
        decimals += 1;
    }
    return decimals;
}
function snapToStep(value, step) {
    if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
        return value;
    }
    const decimals = decimalPlacesFromStep(step);
    const factor = 10 ** decimals;
    const scaledStep = Math.round(step * factor);
    const scaledValue = Math.round(value * factor);
    return (Math.round(scaledValue / scaledStep) * scaledStep) / factor;
}
function normalizeCalculatedValue(value, field) {
    if (value === undefined || value === null)
        return null;
    if (typeof value === "number" && !Number.isFinite(value))
        return null;
    if (typeof value !== "number")
        return value;
    if (field.type === "integer")
        return Math.round(value);
    if (field.type !== "number")
        return value;
    let result = value;
    const step = field.multipleOf;
    if (step !== undefined && step > 0) {
        result = snapToStep(result, step);
    }
    const decimals = field.decimalPlaces !== undefined
        ? clampDecimalPlaces(field.decimalPlaces)
        : step !== undefined && step > 0
            ? decimalPlacesFromStep(step)
            : 2;
    return roundToDecimals(result, decimals);
}
function clampDecimalPlaces(decimals) {
    if (!Number.isFinite(decimals))
        return 0;
    return Math.min(10, Math.max(0, Math.trunc(decimals)));
}
function roundToDecimals(value, decimals) {
    const places = clampDecimalPlaces(decimals);
    if (places <= 0)
        return Math.round(value);
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
}
export function evaluateRules(clinicalSchema, rulesSchema, values, uiSchema) {
    const clinicalFields = collectFields(clinicalSchema.fields);
    const workingValues = { ...values };
    const visibility = {};
    const enabled = {};
    const required = {};
    const calculatedValues = {};
    for (const field of clinicalFields) {
        visibility[field.id] = !(uiSchema?.fields?.[field.id]?.hidden ?? false);
        enabled[field.id] = !(field.readOnly ?? false);
        required[field.id] = field.required ?? false;
    }
    const evaluationOrder = analyzeCalculationOrder(clinicalFields, rulesSchema);
    for (const fieldId of evaluationOrder) {
        const field = clinicalFields.find((item) => item.id === fieldId);
        const calculate = rulesSchema.fields?.[fieldId]?.calculate;
        if (!field || !calculate)
            continue;
        const value = normalizeCalculatedValue(evaluateExpression(calculate, workingValues), field);
        calculatedValues[field.code] = value;
        workingValues[field.code] = value;
    }
    for (const [fieldId, fieldRules] of Object.entries(rulesSchema.fields ?? {})) {
        if (!clinicalFields.some((field) => field.id === fieldId))
            continue;
        if (fieldRules.visibleWhen) {
            visibility[fieldId] = toBoolean(evaluateExpression(fieldRules.visibleWhen, workingValues));
        }
        if (fieldRules.enabledWhen) {
            enabled[fieldId] = toBoolean(evaluateExpression(fieldRules.enabledWhen, workingValues));
        }
        if (fieldRules.requiredWhen) {
            required[fieldId] = toBoolean(evaluateExpression(fieldRules.requiredWhen, workingValues));
        }
    }
    const validationErrors = [];
    for (const validation of rulesSchema.validations ?? []) {
        if (validation.when && !toBoolean(evaluateExpression(validation.when, workingValues))) {
            continue;
        }
        if (!toBoolean(evaluateExpression(validation.assert, workingValues))) {
            validationErrors.push({ code: validation.code, message: validation.message });
        }
    }
    return { visibility, enabled, required, calculatedValues, validationErrors };
}
