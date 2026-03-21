import { NetworkInterface, NetworkRoute } from '../../types'
import { nextId } from '../../defaults'

interface InterfaceEditorProps {
  interfaces: NetworkInterface[]
  onChange: (interfaces: NetworkInterface[]) => void
}

export default function InterfaceEditor({ interfaces, onChange }: InterfaceEditorProps) {
  function addInterface() {
    onChange([
      ...interfaces,
      { _id: nextId(), interface: '', dhcp: true, addresses: [], routes: [], mtu: undefined, vip: undefined },
    ])
  }

  function removeInterface(id: string) {
    onChange(interfaces.filter((i) => i._id !== id))
  }

  function updateInterface(id: string, patch: Partial<NetworkInterface>) {
    onChange(interfaces.map((i) => (i._id === id ? { ...i, ...patch } : i)))
  }

  function addRoute(ifaceId: string) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, {
      routes: [...iface.routes, { _id: nextId(), network: '', gateway: '' }],
    })
  }

  function removeRoute(ifaceId: string, routeId: string) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, { routes: iface.routes.filter((r) => r._id !== routeId) })
  }

  function updateRoute(ifaceId: string, routeId: string, patch: Partial<NetworkRoute>) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, {
      routes: iface.routes.map((r) => (r._id === routeId ? { ...r, ...patch } : r)),
    })
  }

  function addAddress(ifaceId: string) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, { addresses: [...iface.addresses, ''] })
  }

  function removeAddress(ifaceId: string, idx: number) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, { addresses: iface.addresses.filter((_, i) => i !== idx) })
  }

  function updateAddress(ifaceId: string, idx: number, value: string) {
    const iface = interfaces.find((i) => i._id === ifaceId)
    if (!iface) return
    updateInterface(ifaceId, {
      addresses: iface.addresses.map((a, i) => (i === idx ? value : a)),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Network Interfaces</span>
        <button type="button" onClick={addInterface} className="btn-ghost text-xs py-0.5 px-2">
          + Add Interface
        </button>
      </div>

      {interfaces.length === 0 && (
        <p className="text-xs text-slate-400 italic">No interfaces configured. DHCP will be used by default.</p>
      )}

      <div className="space-y-3">
        {interfaces.map((iface) => (
          <div key={iface._id} className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2.5">
            {/* Header row */}
            <div className="flex items-center gap-2">
              <input
                className="input-base flex-1 font-mono text-xs"
                placeholder="eth0"
                value={iface.interface}
                onChange={(e) => updateInterface(iface._id, { interface: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={iface.dhcp}
                  onChange={(e) => updateInterface(iface._id, { dhcp: e.target.checked })}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                />
                DHCP
              </label>
              <button
                type="button"
                onClick={() => removeInterface(iface._id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
                aria-label="Remove interface"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Static addresses */}
            {!iface.dhcp && (
              <div className="pl-2 border-l-2 border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Addresses (CIDR)</span>
                  <button
                    type="button"
                    onClick={() => addAddress(iface._id)}
                    className="btn-ghost text-xs py-0 px-1.5"
                  >
                    + Add
                  </button>
                </div>
                {iface.addresses.map((addr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      className="input-base flex-1 font-mono text-xs"
                      placeholder="192.168.1.100/24"
                      value={addr}
                      onChange={(e) => updateAddress(iface._id, idx, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeAddress(iface._id, idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Routes */}
            <div className="pl-2 border-l-2 border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Routes</span>
                <button
                  type="button"
                  onClick={() => addRoute(iface._id)}
                  className="btn-ghost text-xs py-0 px-1.5"
                >
                  + Add
                </button>
              </div>
              {iface.routes.map((route) => (
                <div key={route._id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                  <input
                    className="input-base font-mono text-xs"
                    placeholder="network (0.0.0.0/0)"
                    value={route.network}
                    onChange={(e) => updateRoute(iface._id, route._id, { network: e.target.value })}
                  />
                  <input
                    className="input-base font-mono text-xs"
                    placeholder="gateway"
                    value={route.gateway}
                    onChange={(e) => updateRoute(iface._id, route._id, { gateway: e.target.value })}
                  />
                  <input
                    className="input-base w-20 font-mono text-xs"
                    placeholder="metric"
                    type="number"
                    value={route.metric ?? ''}
                    onChange={(e) =>
                      updateRoute(iface._id, route._id, {
                        metric: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeRoute(iface._id, route._id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* MTU + VIP */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">MTU</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="1500"
                  type="number"
                  value={iface.mtu ?? ''}
                  onChange={(e) =>
                    updateInterface(iface._id, { mtu: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">VIP</label>
                <input
                  className="input-base font-mono text-xs"
                  placeholder="192.168.1.50"
                  value={iface.vip ?? ''}
                  onChange={(e) =>
                    updateInterface(iface._id, { vip: e.target.value || undefined })
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
