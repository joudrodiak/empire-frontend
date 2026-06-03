'use client'

import { useCallback, useRef, useState } from 'react'
import { EmpireIcon } from '@/components/atoms/EmpireIcon'

/**
 * PhotoDrop — PNG (and other image) drag-and-drop + click-to-browse uploader.
 * Reads the dropped file as a data URL and hands it back via `onChange`, so it
 * works locally with no object store. In production swap the `readAsDataURL`
 * step for an S3 signed-URL upload (see infra/ARCHITECTURE.md) — the value
 * stored on the entity (`avatarUrl`) stays a URL either way, so nothing else
 * changes. Accepts an optional paste-URL fallback for remote images.
 */
export function PhotoDrop({ value, onChange, shape = 'circle', label, allowUrl = true }: {
  value: string
  onChange: (dataUrl: string) => void
  shape?: 'circle' | 'square'
  label?: string
  allowUrl?: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  const readFile = useCallback((file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) { setError('Please drop an image (PNG, JPG, WebP).'); return }
    if (file.size > 4 * 1024 * 1024) { setError('Image is over 4 MB — pick a smaller one.'); return }
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
      <div className="flex items-center gap-3 mt-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative w-16 h-16 flex-shrink-0 flex items-center justify-center border transition-colors overflow-hidden ${radius} ${
            dragOver ? 'border-empire-gold bg-empire-gold/10' : 'border-dashed border-empire-border hover:border-empire-gold/50'
          }`}
          title="Drop a PNG or click to choose"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className={`w-full h-full object-cover ${radius}`} />
          ) : (
            <EmpireIcon name="user" size={20} className="text-empire-text-dim" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-empire-text-muted">
            Drag a <span className="text-empire-text">PNG</span> here, or{' '}
            <button type="button" onClick={() => inputRef.current?.click()} className="text-empire-gold hover:underline">choose a file</button>.
          </div>
          {allowUrl && (
            <input
              className="empire-input w-full mt-1.5 text-xs"
              placeholder="…or paste an image URL"
              value={value.startsWith('data:') ? '' : value}
              onChange={e => onChange(e.target.value)}
            />
          )}
          {value && (
            <button type="button" onClick={() => onChange('')} className="text-[11px] text-empire-text-dim hover:text-empire-red-bright mt-1 inline-flex items-center gap-1">
              <EmpireIcon name="trash" size={11} /> Remove photo
            </button>
          )}
          {error && <p className="text-[11px] text-empire-red-bright mt-1">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
             onChange={e => { const file = e.target.files?.[0]; if (file) readFile(file); e.target.value = '' }} />
    </div>
  )
}
