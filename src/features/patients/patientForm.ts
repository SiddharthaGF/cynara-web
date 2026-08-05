export const MRN_PATTERN = /^[A-Za-z0-9-]+$/;
export const MRN_MAX_LENGTH = 64;
export const NAME_MAX_LENGTH = 128;
export const NATIONAL_ID_MAX_LENGTH = 64;

export interface PatientIdentityFields {
  mrn: string;
  nationalId: string;
  givenName: string;
  familyName: string;
  birthDate: string;
  sex: string;
}

export type PatientFieldErrors = Partial<
  Record<keyof PatientIdentityFields, string>
>;

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validatePatientIdentity(
  values: PatientIdentityFields,
  t: Translate,
  options?: { requireMrn?: boolean; requireNationalId?: boolean },
): PatientFieldErrors {
  const requireMrn = options?.requireMrn ?? true;
  const requireNationalId = options?.requireNationalId ?? false;
  const errors: PatientFieldErrors = {};

  if (requireMrn) {
    if (!values.mrn.trim()) {
      errors.mrn = t('register.errors.mrnRequired');
    } else if (!MRN_PATTERN.test(values.mrn.trim())) {
      errors.mrn = t('register.errors.mrnInvalid');
    } else if (values.mrn.trim().length > MRN_MAX_LENGTH) {
      errors.mrn = t('register.errors.mrnTooLong');
    }
  }

  if (requireNationalId && !values.nationalId.trim()) {
    errors.nationalId = t('register.errors.nationalIdRequired');
  } else if (values.nationalId.trim().length > NATIONAL_ID_MAX_LENGTH) {
    errors.nationalId = t('register.errors.nationalIdTooLong');
  }

  if (!values.givenName.trim()) {
    errors.givenName = t('register.errors.givenNameRequired');
  } else if (values.givenName.trim().length > NAME_MAX_LENGTH) {
    errors.givenName = t('register.errors.givenNameTooLong');
  }

  if (!values.familyName.trim()) {
    errors.familyName = t('register.errors.familyNameRequired');
  } else if (values.familyName.trim().length > NAME_MAX_LENGTH) {
    errors.familyName = t('register.errors.familyNameTooLong');
  }

  if (!values.birthDate.trim()) {
    errors.birthDate = t('register.errors.birthDateRequired');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate.trim())) {
    errors.birthDate = t('register.errors.birthDateInvalid');
  }

  if (!values.sex) {
    errors.sex = t('register.errors.sexRequired');
  }

  return errors;
}

export function formatPatientSex(sex: string, t: Translate): string {
  if (sex === 'male') {
    return t('sex.male');
  }
  if (sex === 'female') {
    return t('sex.female');
  }
  return t('sex.unknown');
}

export function formatPatientStatus(status: string, t: Translate): string {
  if (status === 'retired') {
    return t('status.retired');
  }
  return t('status.active');
}

const PATIENT_DATE_TIME_OPTIONS = {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
} as const satisfies Intl.DateTimeFormatOptions;

const patientDateTimeFormatters: Record<string, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en', PATIENT_DATE_TIME_OPTIONS),
  es: new Intl.DateTimeFormat('es', PATIENT_DATE_TIME_OPTIONS),
};

export function formatPatientDateTime(iso: string, locale: string): string {
  const language = locale.split('-')[0] ?? 'en';
  const formatter =
    patientDateTimeFormatters[language] ?? patientDateTimeFormatters.en;
  return formatter.format(new Date(iso));
}

export function formatPatientResultDescription(
  isLoading: boolean,
  resultCount: number,
  t: Translate,
): string | undefined {
  if (isLoading) {
    return t('search.searching');
  }
  if (resultCount > 0) {
    return t('search.resultCount', { count: resultCount });
  }
  return undefined;
}
