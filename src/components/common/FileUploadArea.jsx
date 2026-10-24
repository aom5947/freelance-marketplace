import { useRef, useState } from 'react'
import { FileText, UploadCloud, X } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Files are kept in browser memory only. There is no upload endpoint yet, so the
 * UI never claims a file was uploaded to the server.
 */
export function FileUploadArea({ files = [], onFilesChange, label = 'แนบไฟล์งาน', hint, className }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (fileList) => {
    const next = [...files]
    Array.from(fileList || []).forEach((file) => {
      if (!next.some((item) => item.name === file.name && item.size === file.size)) next.push(file)
    })
    onFilesChange?.(next)
  }

  const removeFile = (name, size) => {
    onFilesChange?.(files.filter((file) => !(file.name === name && file.size === size)))
  }

  return (
    <div className={className}>
      {label && <p className="field-label">{label}</p>}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          addFiles(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-7 text-center transition',
          dragging ? 'border-brand-400 bg-brand-50' : 'border-ink/[0.12] bg-paper-soft hover:border-brand-300',
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm">
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink">ลากไฟล์มาวาง หรือเลือกจากเครื่อง</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-500">
          {hint || 'ไฟล์จะถูกเก็บไว้ในเบราว์เซอร์เท่านั้น — ยังไม่มีการอัปโหลดขึ้นเซิร์ฟเวอร์'}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand-300 hover:text-brand-700"
        >
          เลือกไฟล์
        </button>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-2.5 rounded-lg border border-ink/10 bg-white px-3 py-2"
            >
              <FileText className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{file.name}</span>
              <span className="text-[10px] text-ink-400">{Math.max(1, Math.round(file.size / 1024))} KB</span>
              <button
                type="button"
                onClick={() => removeFile(file.name, file.size)}
                className="rounded p-1 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`ลบไฟล์ ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
