export const PASSWORD_MIN_LENGTH = 6;
export const UPPERCASE_PATTERN = /[A-Z]/;
export const LOWERCASE_PATTERN = /[a-z]/;
export const NUMBER_PATTERN = /[0-9]/;
// Anything other than letters, digits, or whitespace counts as a symbol.
export const SYMBOL_PATTERN = /[^A-Za-z0-9\s]/;

export interface PasswordRule {
  key: string;
  test: (value: string) => boolean;
}

/**
 * Ordered rule list rendered under the password input. Order matches the
 * `passwordIssueKey` checks and the `accept.passwordRules.*` locale keys.
 */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    key: 'length',
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  { key: 'uppercase', test: (value) => UPPERCASE_PATTERN.test(value) },
  { key: 'lowercase', test: (value) => LOWERCASE_PATTERN.test(value) },
  { key: 'number', test: (value) => NUMBER_PATTERN.test(value) },
  { key: 'symbol', test: (value) => SYMBOL_PATTERN.test(value) },
];

/**
 * Validate the password against the rules announced in the hint. Returns the
 * first failing rule's key so the user sees one actionable message at a time
 * (in input order) instead of a wall of errors.
 */
export function passwordIssueKey(value: string): string | null {
  if (value.length === 0) {
    return 'accept.passwordRequired';
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return 'accept.passwordTooShort';
  }
  if (!UPPERCASE_PATTERN.test(value)) {
    return 'accept.passwordMissingUppercase';
  }
  if (!LOWERCASE_PATTERN.test(value)) {
    return 'accept.passwordMissingLowercase';
  }
  if (!NUMBER_PATTERN.test(value)) {
    return 'accept.passwordMissingNumber';
  }
  if (!SYMBOL_PATTERN.test(value)) {
    return 'accept.passwordMissingSymbol';
  }
  return null;
}
