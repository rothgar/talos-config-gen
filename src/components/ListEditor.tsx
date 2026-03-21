interface ListEditorProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  hint?: string
}

export default function ListEditor({ label, items, onChange, placeholder = 'value', hint }: ListEditorProps) {
  function addItem() {
    onChange([...items, ''])
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, value: string) {
    onChange(items.map((v, i) => (i === idx ? value : v)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button type="button" onClick={addItem} className="btn-ghost text-xs py-0.5 px-2">
          + Add
        </button>
      </div>
      {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic">No entries. Click + Add to create one.</p>
      )}
      <div className="space-y-1.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              className="input-base flex-1 font-mono text-xs"
              placeholder={placeholder}
              value={item}
              onChange={(e) => updateItem(idx, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
              aria-label="Remove"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
