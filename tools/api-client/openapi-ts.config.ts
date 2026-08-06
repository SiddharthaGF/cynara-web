import { defineConfig } from '@hey-api/openapi-ts';

const DEFAULT_SPEC = '../../../cynara-api/contracts/openapi.json';

const input =
  process.env.OPENAPI_SPEC_URL ?? process.env.OPENAPI_SPEC ?? DEFAULT_SPEC;

export default defineConfig({
  input,
  output: '../../src/api/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../../src/api/client-runtime.ts',
      throwOnError: true,
    },
  ],
});
