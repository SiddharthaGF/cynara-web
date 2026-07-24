export type Expression = {
    ref: string;
} | {
    lit: unknown;
} | {
    op: string;
    args: Expression[];
};
export interface RuleValidationError {
    code: string;
    message: string;
}
export interface FormRuleEvaluationResult {
    visibility: Record<string, boolean>;
    enabled: Record<string, boolean>;
    required: Record<string, boolean>;
    calculatedValues: Record<string, unknown>;
    validationErrors: RuleValidationError[];
}
interface ClinicalField {
    id: string;
    code: string;
    type?: string;
    required?: boolean;
    readOnly?: boolean;
    multipleOf?: number;
    decimalPlaces?: number;
    items?: ClinicalField[];
}
interface RulesSchema {
    fields?: Record<string, {
        visibleWhen?: Expression;
        enabledWhen?: Expression;
        requiredWhen?: Expression;
        calculate?: Expression;
    }>;
    validations?: Array<{
        code: string;
        message: string;
        when?: Expression;
        assert: Expression;
    }>;
}
export declare function evaluateRules(clinicalSchema: {
    fields: ClinicalField[];
}, rulesSchema: RulesSchema, values: Record<string, unknown>, uiSchema?: {
    fields?: Record<string, {
        hidden?: boolean;
    }>;
}): FormRuleEvaluationResult;
export {};
