import mammoth from 'mammoth'

export async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const extractedText = result.value
  const wordCount = extractedText.split(/\s+/).filter(Boolean).length
  return { extractedText, wordCount }
}
