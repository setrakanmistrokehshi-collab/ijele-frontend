import { useId } from 'react';

/**
 * A text input with a VISIBLE label (so it never disappears while typing) and an error message wired up for
 * screen readers (aria-invalid + aria-describedby). Placeholders are only for example formats.
 */
export default function Field({ label, error, id, onValueChange, onValueBlur, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="fld">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId} type="text" {...props}
        aria-invalid={error ? 'true' : undefined} aria-describedby={error ? errorId : undefined}
        onChange={(event) => { props.onChange?.(event); onValueChange?.(event.target.name); }}
        onBlur={(event) => onValueBlur?.(event.target.name, event.target.value)}
      />
      {error && <p id={errorId} role="alert" className="field-error">{error}</p>}
    </div>
  );
}
