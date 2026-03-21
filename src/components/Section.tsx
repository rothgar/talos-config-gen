import { useState, ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
  badge?: string
}

export default function Section({ title, subtitle, defaultOpen = true, children, badge }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {badge && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {badge}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3">{children}</div>}
    </div>
  )
}
