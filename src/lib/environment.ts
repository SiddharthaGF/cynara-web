export type Environment = 'development' | 'production' | 'testing';

const ENVIRONMENT_VALUES: readonly Environment[] = [
  'development',
  'production',
  'testing',
];

function readAppEnv(): string | undefined {
  const fromAppEnv = import.meta.env.APP_ENV;

  if (typeof fromAppEnv === 'string' && fromAppEnv.length > 0) {
    return fromAppEnv;
  }

  return undefined;
}

function parseEnvironment(value: string | undefined): Environment {
  if (
    value !== undefined &&
    (ENVIRONMENT_VALUES as readonly string[]).includes(value)
  ) {
    return value as Environment;
  }
  return 'development';
}

export const environment: Environment = parseEnvironment(readAppEnv());

export function isDevelopment(
  environmentName: Environment = environment,
): boolean {
  return environmentName === 'development';
}

export function isProduction(
  environmentName: Environment = environment,
): boolean {
  return environmentName === 'production';
}

export function isTest(environmentName: Environment = environment): boolean {
  return environmentName === 'testing';
}
