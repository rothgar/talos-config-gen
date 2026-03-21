import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  inline?: boolean
}

export default function FormField({ label, hint, htmlFor, children, inline = false }: FormFieldProps) {
  if (inline) {
    return (
      <div className="flex items-center gap-3">
        {children}
        <div>
          <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
            {label}
          </label>
          {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
