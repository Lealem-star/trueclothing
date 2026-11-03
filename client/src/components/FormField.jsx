import React from 'react';

export default function FormField({
  id,
  label,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  required = false,
  rows = 3,
  options = [],
  error = null,
  min,
  max,
  step
}) {
  return (
    <div>
      {label && (
        <label className="lb" htmlFor={id}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
      )}

      {type === 'textarea' ? (
        <textarea
          id={id}
          className="in"
          rows={rows}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          className="in"
          value={value ?? ''}
          onChange={onChange}
        >
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          className="in"
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          min={min}
          max={max}
          step={step}
        />
      )}

      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

