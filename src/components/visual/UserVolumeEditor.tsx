import { UserVolume } from '../../types'
import { nextId } from '../../defaults'

interface UserVolumeEditorProps {
  volumes: UserVolume[]
  onChange: (volumes: UserVolume[]) => void
}

export default function UserVolumeEditor({ volumes, onChange }: UserVolumeEditorProps) {
  function addVolume() {
    onChange([
      ...volumes,
      { _id: nextId(), name: '', minSize: '', maxSize: '', diskSelectorSize: '', diskSelectorName: '' },
    ])
  }

  function removeVolume(id: string) {
    onChange(volumes.filter((v) => v._id !== id))
  }

  function updateVolume(id: string, patch: Partial<UserVolume>) {
    onChange(volumes.map((v) => (v._id === id ? { ...v, ...patch } : v)))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">User Volumes</span>
        <button type="button" onClick={addVolume} className="btn-ghost text-xs py-0.5 px-2">
          + Add Volume
        </button>
      </div>

      {volumes.length === 0 && (
        <p className="text-xs text-slate-400 italic">No user volumes configured.</p>
      )}

      <div className="space-y-3">
        {volumes.map((vol) => (
          <div key={vol._id} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                className="input-base flex-1 font-mono text-xs"
                placeholder="volume name (e.g. var-lib-containerd)"
                value={vol.name}
                onChange={(e) => updateVolume(vol._id, { name: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeVolume(vol._id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Min Size</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="e.g. 10GB"
                  value={vol.minSize}
                  onChange={(e) => updateVolume(vol._id, { minSize: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Max Size</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="e.g. 100GB"
                  value={vol.maxSize}
                  onChange={(e) => updateVolume(vol._id, { maxSize: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Disk Selector: Size</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="e.g. >= 100GB"
                  value={vol.diskSelectorSize}
                  onChange={(e) => updateVolume(vol._id, { diskSelectorSize: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Disk Selector: Name</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="e.g. /dev/sdb"
                  value={vol.diskSelectorName}
                  onChange={(e) => updateVolume(vol._id, { diskSelectorName: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
