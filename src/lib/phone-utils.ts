import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type NormalizedPhoneNumber = {
  e164: string;
  national: string;
  country: CountryCode;
};

const DEFAULT_COUNTRY: CountryCode = 'IN';

const NON_DIALABLE_REGEX = /[^0-9+]/g;

export function stripToDialable(input?: string | null): string {
  if (!input) {
    return '';
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  const sanitized = trimmed.replace(NON_DIALABLE_REGEX, '');
  return sanitized.replace(/(?!^)[+]/g, '');
}

export function normalizePhoneNumber(
  input?: string | null,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): NormalizedPhoneNumber | null {
  const dialable = stripToDialable(input);
  if (!dialable) {
    return null;
  }

  let candidate = dialable;
  if (candidate.startsWith('00')) {
    candidate = `+${candidate.slice(2)}`;
  }

  let parsed = parsePhoneNumberFromString(candidate, defaultCountry);

  if (!parsed && !candidate.startsWith('+')) {
    parsed = parsePhoneNumberFromString(`+${candidate}`);
  }

  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return {
    e164: parsed.number,
    national: parsed.formatNational(),
    country: parsed.country ?? defaultCountry,
  };
}

export function normalizePhoneNumberOrThrow(
  input: string,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): NormalizedPhoneNumber {
  const normalized = normalizePhoneNumber(input, defaultCountry);
  if (!normalized) {
    throw new Error('Invalid phone number');
  }
  return normalized;
}

export function validatePhoneNumber(
  input?: string | null,
  defaultCountry: CountryCode = DEFAULT_COUNTRY
): boolean {
  return normalizePhoneNumber(input, defaultCountry) !== null;
}
