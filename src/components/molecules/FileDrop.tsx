'use client'

import { useCallback, useRef, useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp'
const MAX_MB = 8

/**
 * FileDrop — drag-and-drop (or click-to-browse) for a contract document: a PDF or
 * an image (PNG/JPG/WebP). Reads the file as a data URL and hands it back via
 * `onChange`, so it persists locally with no object store — the value lives in the
 * entity's `fileUrl`. In production swap `readAsDataURL` for an S3 signed-URL upload
 * (see infra/ARCHITECTURE.md); `fileUrl` stays a URL either way, so no caller
 * changes. A paste-URL fallback lets you point at an already-hosted document.
 */
export function FileDrop({ value, onChange, label, allowUrl = true }: {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
  allowUrl?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const isData = value.startsWith('data:')
  const isPdf = /^data:application\/pdf/.test(value) || /\.pdf($|\?)/i.test(value)
  const isImg = /^data:image\//.test(value) || /\.(png|jpe?g|gif|webp)($|\?)/i.test(value)

  const readFile = useCallback((file: File) => {
    setError('')
    const ok = file.type === 'application/pdf' || file.type.startsWith('image/')
    if (!ok) { setError('Drop a PDF or an image (PNG, JPG, WebP).'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File is over ${MAX_MB} MB — pick a smaller one.`); return }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => onChange(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsDataURL(file)
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }, [readFile])

  return (
    <div>
      {label && <label className="empire-label">{label}</label>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-1 w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors text-left ${
          dragOver ? 'border-empire-gold bg-empire-gold/10' : 'border-dashed border-empire-border hover:border-empire-gold/50'
        }`}
        title="Drop a PDF or image, or click to choose"
      >
        <EmpireIcon name={value ? 'document' : 'plus'} size={18} className="text-empire-gold-muted flex-shrink-0" />
        <span className="text-xs text-empire-text-muted min-w-0 truncate">
          {value ? (
            <span className="text-empire-text">{fileName || (isData ? `Attached ${isPdf ? 'PDF' : 'image'}` : value)}</span>
          ) : (
            <>Drag a <span className="text-empire-text">PDF or PNG</span> here, or <span className="text-empire-gold">choose a file</span>.</>
          )}
        </span>
      </button>

      {value && isImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="mt-2 max-h-40 rounded-lg border border-empire-border object-contain bg-empire-void" />
      )}
      {value && isPdf && isData && (
        <iframe src={value} title="Contract document" className="mt-2 w-full h-48 rounded-lg border border-empire-border bg-empire-void" />
      )}

      <div className="flex items-center gap-3 mt-1.5">
        {value && (
          <button type="button" onClick={() => { onChange(''); setFileName('') }} className="text-[11px] text-empire-text-dim hover:text-empire-red-bright inline-flex items-center gap-1">
            <EmpireIcon name="trash" size={11} /> Remove
          </button>
        )}
        {allowUrl && (
          <input
            className="empire-input flex-1 text-xs"
            placeholder="…or paste a document URL"
            value={isData ? '' : value}
            onChange={e => onChange(e.target.value)}
          />
        )}
      </div>
      {error && <p className="text-[11px] text-empire-red-bright mt-1">{error}</p>}

      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
             onChange={e => { const file = e.target.files?.[0]; if (file) readFile(file); e.target.value = '' }} />
    </div>
  )
}
