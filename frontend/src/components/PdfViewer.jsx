import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { loadPdf } from '@/utils/pdf-store'
import { Spinner } from '@/components/ui/Spinner'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function PdfPage({ pdfDoc, pageNum }) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let renderTask = null

    const render = async () => {
      const page = await pdfDoc.getPage(pageNum)
      if (cancelled || !canvasRef.current || !wrapperRef.current) return

      const containerWidth = wrapperRef.current.clientWidth || 600
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height

      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      await renderTask.promise
    }

    render().catch(() => {})
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDoc, pageNum])

  return (
    <div ref={wrapperRef} className="w-full border border-[var(--border)] rounded-sm overflow-hidden bg-white">
      <canvas ref={canvasRef} className="w-full block" />
    </div>
  )
}

export function PdfViewer({ docId, fileType, fallbackText }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (fileType !== 'pdf') {
      setNotFound(true)
      setLoading(false)
      return
    }

    loadPdf(docId)
      .then((arrayBuffer) => {
        if (!arrayBuffer) {
          setNotFound(true)
          setLoading(false)
          return
        }
        return pdfjsLib.getDocument({ data: arrayBuffer }).promise
      })
      .then((doc) => {
        if (doc) { setPdfDoc(doc); setLoading(false) }
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [docId, fileType])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="prose-reading text-[var(--text-primary)] max-w-[640px] whitespace-pre-wrap">
        {fallbackText || (
          <span className="text-[var(--text-muted)] italic text-sm">
            {fileType === 'pdf'
              ? 'File PDF không còn trong bộ nhớ trình duyệt. Upload lại để xem.'
              : 'Không có văn bản.'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: pdfDoc.numPages }, (_, i) => (
        <PdfPage key={i + 1} pdfDoc={pdfDoc} pageNum={i + 1} />
      ))}
    </div>
  )
}
