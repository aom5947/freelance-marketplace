import { useId } from 'react'
import { cn } from '@/utils/cn'

function FieldShell({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-500/80">{hint}</p>
      )}
    </div>
  )
}

export function Input({ label, error, hint, required, className, id, prefix, suffix, ...props }) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            'field-control',
            error && 'field-error',
            prefix && 'pl-9',
            suffix && 'pr-16',
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-500">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  )
}

export function Textarea({ label, error, hint, required, className, id, rows = 5, ...props }) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn('field-control resize-y leading-relaxed', error && 'field-error', className)}
        {...props}
      />
    </FieldShell>
  )
}

export function Select({ label, error, hint, required, className, id, children, ...props }) {
  const autoId = useId()
  const inputId = id || autoId
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
      <select
        id={inputId}
        aria-invalid={Boolean(error)}
        className={cn('field-control appearance-none bg-white pr-9', error && 'field-error', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}
