// Client-side mirror of the server's zod rules (backend/src/validators/). The server stays the authority;
// these checks stop garbage from being sent at all and give instant, specific feedback.

const CONTROL = /[\u0000-\u001F\u007F]/g;
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000B-\u001F\u007F]/g;
const EMAIL = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const ORDER_NUMBER = /^AUR-\d{6,8}$/;

/** Single line: control characters become spaces, runs of whitespace collapse, ends are trimmed. */
export const cleanLine = (value) => String(value ?? '').normalize('NFC').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
/** Multi-line: keeps line breaks, drops other control characters, limits blank lines. */
export const cleanBlock = (value) =>
  String(value ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(CONTROL_EXCEPT_NEWLINE, '').replace(/\n{3,}/g, '\n\n').trim();

/** A field is { clean, check }: clean() normalises the raw input, check() returns an error message or ''. */
export const line = (label, { min = 1, max }) => ({
  clean: cleanLine,
  check: (value) => {
    if (value.length < min) return `${label} is required.`;
    return value.length > max ? `${label} is too long (max ${max}).` : '';
  },
});
export const block = (label, { min = 1, max }) => ({
  clean: cleanBlock,
  check: (value) => {
    if (value.length < min) return min > 1 ? `${label} needs at least ${min} characters.` : `${label} is required.`;
    return value.length > max ? `${label} is too long (max ${max}).` : '';
  },
});
export const email = {
  clean: (value) => cleanLine(value).toLowerCase(),
  check: (value) => {
    if (!value) return 'Email is required.';
    return value.length <= 254 && EMAIL.test(value) ? '' : 'Enter a valid email address.';
  },
};
export const phone = (optional = false) => ({
  clean: cleanLine,
  check: (value) => {
    if (!value) return optional ? '' : 'Phone number is required.';
    const looksValid = PHONE.test(value) && value.replace(/\D/g, '').length >= 7;
    return looksValid ? '' : 'Enter a valid phone number, e.g. +234 801 234 5678.';
  },
});
export const orderNumber = {
  clean: (value) => cleanLine(value).toUpperCase(),
  check: (value) => (ORDER_NUMBER.test(value) ? '' : 'Order numbers look like AUR-1234567.'),
};
/** Passwords are never trimmed or altered, only length-checked (the server allows up to 256). */
export const password = {
  clean: (value) => String(value ?? ''),
  check: (value) => {
    if (!value) return 'Password is required.';
    return value.length > 256 ? 'Password is too long.' : '';
  },
};

/** Cleans every field in `spec` and collects errors. Returns { ok, values, errors }. */
export function validateForm(values, spec) {
  const cleaned = {};
  const errors = {};
  for (const [name, field] of Object.entries(spec)) {
    cleaned[name] = field.clean(values[name]);
    const message = field.check(cleaned[name]);
    if (message) errors[name] = message;
  }
  return { ok: Object.keys(errors).length === 0, values: cleaned, errors };
}
