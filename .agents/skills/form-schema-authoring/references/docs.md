# Local schema sources

Meta-schemas live in the API package (workspace sibling):

- `../../../../cynara-api-nest/schemas/v1/clinical-schema.schema.json`
- `../../../../cynara-api-nest/schemas/v1/ui-schema.schema.json`
- `../../../../cynara-api-nest/schemas/v1/rules-schema.schema.json`

Contract docs (workspace sibling `cynara/`):

- `../../../../cynara/docs/clinical-form-schema.md`
- `../../../../cynara/docs/rules-schema.md`
- `../../../../cynara/docs/semantic-rules.md`
- `../../../../cynara/examples/vital-signs/`

Designer defaults in this package:

- `../../../src/features/forms/designer/fieldInspectorMeta.ts`
- `../../../src/features/forms/validation/validateDraft.ts`

Server-side validation (API):

- `../../../../cynara-api-nest/src/infrastructure/schemas/json-schema.validator.ts`
