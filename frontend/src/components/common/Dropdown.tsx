import React from 'react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: DropdownOption[];
  error?: string;
  wrapperClassName?: string;
}

export const Dropdown = React.forwardRef<HTMLSelectElement, DropdownProps>(({
  label,
  options,
  error,
  wrapperClassName = '',
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseSelectStyle = 'block w-full px-3 py-2 border rounded-lg shadow-sm text-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
  
  const borderStyle = error
    ? 'border-danger focus:ring-danger text-danger bg-danger/5'
    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-primary';

  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`${baseSelectStyle} ${borderStyle} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-danger font-medium">{error}</p>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';
