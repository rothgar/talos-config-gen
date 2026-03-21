import { TalosConfig } from '../types'
import MachineSection from './visual/MachineSection'
import ClusterSection from './visual/ClusterSection'
import { useState } from 'react'

interface VisualEditorProps {
  config: TalosConfig
  onChange: (config: TalosConfig) => void
}

type TopSection = 'machine' | 'cluster'

export default function VisualEditor({ config, onChange }: VisualEditorProps) {
  const [openSection, setOpenSection] = useState<TopSection>('machine')

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Machine Configuration */}
      <TopLevelSection
        id="machine"
        open={openSection === 'machine'}
        onToggle={() => setOpenSection(openSection === 'machine' ? 'cluster' : 'machine')}
        title="Machine Configuration"
        subtitle="Node-level settings: network, install, kubelet, features"
        color="blue"
      >
        <MachineSection config={config} onChange={onChange} />
      </TopLevelSection>

      {/* Cluster Configuration */}
      <TopLevelSection
        id="cluster"
        open={openSection === 'cluster'}
        onToggle={() => setOpenSection(openSection === 'cluster' ? 'machine' : 'cluster')}
        title="Cluster Configuration"
        subtitle="Cluster-wide settings: control plane, networking, components"
        color="purple"
      >
        <ClusterSection config={config} onChange={onChange} />
      </TopLevelSection>
    </div>
  )
}

interface TopLevelSectionProps {
  id: string
  open: boolean
  onToggle: () => void
  title: string
  subtitle: string
  color: 'blue' | 'purple'
  children: React.ReactNode
}

function TopLevelSection({ open, onToggle, title, subtitle, color, children }: TopLevelSectionProps) {
  const accent = color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'
  const accentLight = color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
  const accentText = color === 'blue' ? 'text-blue-700' : 'text-purple-700'

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:opacity-90 transition-opacity ${accentLight}`}
      >
        <div className={`h-8 w-1 rounded-full ${accent} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-base font-bold ${accentText}`}>{title}</div>
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="p-5 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  )
}
