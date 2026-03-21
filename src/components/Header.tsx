import { useState } from 'react'
import { View } from '../types'
import { TALOS_VERSIONS, TalosVersion } from '../versions'

interface HeaderProps {
  view: View
  onViewChange: (v: View) => void
  selectedVersion: TalosVersion
  onVersionChange: (v: TalosVersion) => void
  onDownload: () => void
  onShare: () => void
}

export default function Header({
  view,
  onViewChange,
  selectedVersion,
  onVersionChange,
  onDownload,
  onShare,
}: HeaderProps) {
  const [copied, setCopied] = useState(false)

  function handleShare() {
    onShare()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-lg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Logo + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded bg-orange-500 font-mono font-bold text-sm">
            T
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold leading-tight">Talos Config Generator</div>
            <div className="text-xs text-slate-400 leading-tight">Visual Talos Linux configuration</div>
          </div>
          <div className="block sm:hidden text-sm font-semibold">Talos Config</div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Version selector */}
          <select
            value={selectedVersion.version}
            onChange={(e) => {
              const v = TALOS_VERSIONS.find((t) => t.version === e.target.value)
              if (v) onVersionChange(v)
            }}
            className="rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200
              focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {TALOS_VERSIONS.map((v) => (
              <option key={v.version} value={v.version}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Download */}
          <button
            type="button"
            onClick={onDownload}
            title="Download YAML"
            className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5
              text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            title="Copy share URL"
            className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5
              text-xs font-medium transition-colors"
            style={{ color: copied ? '#86efac' : undefined }}
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-t border-slate-700 px-4">
        <TabButton active={view === 'visual'} onClick={() => onViewChange('visual')}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Visual Config
        </TabButton>
        <TabButton active={view === 'yaml'} onClick={() => onViewChange('yaml')}>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          YAML
        </TabButton>
      </div>
    </header>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-400 text-blue-400'
          : 'border-transparent text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  )
}
