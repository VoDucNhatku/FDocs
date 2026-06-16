const DB_NAME = 'fdocs-pdf-store'
const STORE_NAME = 'pdfs'
const DB_VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME)
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

export async function savePdf(docId, arrayBuffer) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(arrayBuffer, `pdf-${docId}`)
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function loadPdf(docId) {
  const db = await openDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(`pdf-${docId}`)
    request.onsuccess = (e) => resolve(e.target.result ?? null)
    request.onerror = () => resolve(null)
  })
}

export async function deletePdf(docId) {
  const db = await openDb()
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(`pdf-${docId}`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
