import { KVPair } from '../types'
import { nextId } from '../defaults'

interface KeyValueEditorProps {
  label: string
  items: KVPair[]
  onChange: (items: KVPair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export default function KeyValueEditor({
  label,
  items,
  onChange,
  keyPlaceholder = 'key',
  valuePlaceholder = 'value',
}: KeyValueEditorProps) {
  function addItem() {
    onChange([...items, { _id: nextId(), key: '', value: '' }])
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i._id !== id))
  }

  function updateItem(id: string, field: 'key' | 'value', value: string) {
    onChange(items.map((i) => (i._id === id ? { ...i, [field]: value } : i)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button type="button" onClick={addItem} className="btn-ghost text-xs py-0.5 px-2">
          + Add
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic">No entries. Click + Add to create one.</p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item._id} className="flex gap-2 items-center">
            <input
              className="input-base flex-1 font-mono text-xs"
              placeholder={keyPlaceholder}
              value={item.key}
              onChange={(e) => updateItem(item._id, 'key', e.target.value)}
            />
            <span className="text-slate-400 text-xs">:</span>
            <input
              className="input-base flex-1 font-mono text-xs"
              placeholder={valuePlaceholder}
              value={item.value}
              onChange={(e) => updateItem(item._id, 'value', e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeItem(item._id)}
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
