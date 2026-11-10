import { useCallback, useState } from 'react';
import { validateForm } from '../utils/validation.js';

/** Field errors for one form. `spec` must be a stable object (declare it at module level). */
export function useFormValidation(spec) {
  const [errors, setErrors] = useState({});
  const clear = useCallback((name) => setErrors((current) => (current[name] ? { ...current, [name]: '' } : current)), []);
  // Blur checks skip empty fields, so "required" only shows once the visitor tries to submit.
  const blur = useCallback((name, value) => {
    if (!value) return;
    const { errors: found } = validateForm({ [name]: value }, { [name]: spec[name] });
    setErrors((current) => ({ ...current, [name]: found[name] ?? '' }));
  }, [spec]);
  const validate = useCallback((values, form) => {
    const result = validateForm(values, spec);
    setErrors(result.errors);
    if (!result.ok) requestAnimationFrame(() => form?.querySelector('[aria-invalid="true"]')?.focus());
    return result;
  }, [spec]);
  return { errors, clear, blur, validate };
}
