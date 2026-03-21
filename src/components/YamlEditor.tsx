import CodeMirror from '@uiw/react-codemirror'
import { yaml as yamlLang } from '@codemirror/lang-yaml'
import { oneDark } from '@codemirror/theme-one-dark'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
}

export default function YamlEditor({ value, onChange, error }: YamlEditorProps) {
  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs">
          <svg
            className="h-4 w-4 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">YAML parse error:</span>
          <span className="font-mono">{error}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={value}
          height="100%"
          theme={oneDark}
          extensions={[yamlLang()]}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            autocompletion: false,
          }}
          style={{ fontSize: '13px', fontFamily: 'ui-monospace, monospace' }}
        />
      </div>
      <div className="px-4 py-1.5 bg-slate-800 text-slate-400 text-xs border-t border-slate-700 flex items-center justify-between">
        <span>YAML — edit directly and changes will sync to Visual Config</span>
        <span>{value.split('\n').length} lines</span>
      </div>
    </div>
  )
}
