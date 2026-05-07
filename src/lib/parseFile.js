import Papa from 'papaparse'

const CURRENCY_RE = /[£$€¥₹]/g
const THOUSANDS_RE = /,(?=\d{3})/g
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  /^[A-Za-z]+ \d{1,2},?\s+\d{4}$/,
]

const MAX_BYTES = 10 * 1024 * 1024

export function validateFile(file) {
  if (file.size > MAX_BYTES) return 'File is too large. Maximum size is 10 MB.'
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['csv', 'xlsx', 'xls'].includes(ext)) return 'Unsupported file type. Please upload a CSV or Excel file.'
  return null
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'csv') return parseCSV(file)
  return parseExcel(file)
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: ({ data, meta, errors }) => {
        if (data.length === 0) {
          reject(new Error('The file appears to be empty or has no data rows.'))
          return
        }
        resolve(processRawData(data, meta.fields ?? [], 'csv'))
      },
      error: err => reject(new Error(`Could not parse CSV: ${err.message}. Check the file format or see the guide.`)),
    })
  })
}

async function parseExcel(file) {
  const XLSX = await import('xlsx')
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const ws = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false })
        if (rawRows.length === 0) { reject(new Error('The sheet appears to be empty.')); return }
        const headers = Object.keys(rawRows[0])
        resolve(processRawData(rawRows, headers, 'excel'))
      } catch {
        reject(new Error('Could not read Excel file. Try saving as CSV and uploading again.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsArrayBuffer(file)
  })
}

function processRawData(rawRows, headers, source) {
  const columnTypes = detectColumnTypes(headers, rawRows)
  const cleanedRows = rawRows.map(row => cleanRow(row, headers, columnTypes))
  const issues = detectIssues(headers, rawRows, columnTypes)
  return { rows: cleanedRows, headers, columnTypes, issues, rowCount: rawRows.length, source }
}

export function detectColumnTypes(headers, rows) {
  const types = {}
  headers.forEach(h => {
    const values = rows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    if (values.length === 0) { types[h] = 'empty'; return }

    const numericCount = values.filter(v => {
      const s = String(v).replace(CURRENCY_RE, '').replace(THOUSANDS_RE, '').trim()
      return s !== '' && !isNaN(Number(s))
    }).length
    if (numericCount / values.length >= 0.85) { types[h] = 'number'; return }

    const sample = values.slice(0, 10)
    const dateCount = sample.filter(v => {
      const s = String(v).trim()
      if (DATE_PATTERNS.some(p => p.test(s))) return true
      const d = new Date(s)
      return !isNaN(d.getTime()) && s.length > 4 && !/^\d+$/.test(s)
    }).length
    if (dateCount / sample.length >= 0.7) { types[h] = 'date'; return }

    types[h] = 'string'
  })
  return types
}

function cleanRow(row, headers, columnTypes) {
  const out = {}
  headers.forEach(h => {
    const raw = row[h]
    if (raw === null || raw === undefined || String(raw).trim() === '') { out[h] = null; return }
    const str = String(raw).trim()
    const stripped = str.replace(CURRENCY_RE, '').replace(THOUSANDS_RE, '').trim()

    if (columnTypes[h] === 'number') {
      const n = Number(stripped)
      out[h] = isNaN(n) ? null : n
      return
    }
    if (columnTypes[h] === 'date') {
      const d = new Date(str)
      out[h] = isNaN(d.getTime()) ? str : d.toISOString().split('T')[0]
      return
    }
    out[h] = str
  })
  return out
}

export function detectIssues(headers, rows, columnTypes) {
  const issues = []
  const seen = new Set()

  headers.forEach(h => {
    if (!h || h.trim() === '') {
      if (!seen.has('empty_header')) {
        issues.push({ type: 'error', msg: 'One or more columns has an empty header — add column names to the first row.' })
        seen.add('empty_header')
      }
    } else if (/^\d+$/.test(h.trim())) {
      issues.push({ type: 'warning', msg: `Column "${h}" looks like a number — your file may be missing a header row. See the guide.` })
    }
  })

  headers.forEach(h => {
    if (columnTypes[h] !== 'number') return
    const values = rows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    if (values.length === 0) return
    const nonNumeric = values.filter(v => {
      const s = String(v).replace(CURRENCY_RE, '').replace(THOUSANDS_RE, '').trim()
      return isNaN(Number(s)) || s === ''
    })
    if (nonNumeric.length > 0 && nonNumeric.length <= values.length * 0.15) {
      issues.push({ type: 'warning', msg: `Column "${h}" has ${nonNumeric.length} non-numeric value${nonNumeric.length > 1 ? 's' : ''} that will be treated as empty.` })
    }
  })

  const numericCols = headers.filter(h => columnTypes[h] === 'number')
  if (numericCols.length === 0 && rows.length > 0) {
    issues.push({ type: 'warning', msg: 'No numeric columns detected. At least one number column is needed to generate charts.' })
  }

  const dateCols = headers.filter(h => columnTypes[h] === 'date')
  dateCols.forEach(h => {
    const values = rows.map(r => r[h]).filter(Boolean)
    const mixedFormats = values.slice(0, 20).some(v => !/^\d{4}-\d{2}-\d{2}$/.test(String(v)))
    if (mixedFormats) {
      issues.push({ type: 'info', msg: `Date column "${h}" has been standardised to ISO format (YYYY-MM-DD).` })
    }
  })

  return issues
}

export function deriveTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'My Report'
}

export function suggestColumnConfig(headers, columnTypes) {
  const dateOrString = headers.filter(h => columnTypes[h] === 'date' || columnTypes[h] === 'string')
  const numeric = headers.filter(h => columnTypes[h] === 'number')
  const strings = headers.filter(h => columnTypes[h] === 'string')

  const xAxis = headers.find(h => columnTypes[h] === 'date') || dateOrString[0] || headers[0] || ''
  const yAxis = numeric.length > 0 ? [numeric[0]] : []
  const series = strings.find(h => h !== xAxis) || ''

  return { xAxis, yAxis, series }
}

export function suggestChartConfigs(headers, columnTypes) {
  const numericCols = headers.filter(h => columnTypes[h] === 'number')
  const xAxis = headers.find(h => columnTypes[h] === 'date')
    ?? headers.find(h => columnTypes[h] === 'string')
    ?? headers[0]
    ?? ''
  const fallback = numericCols[0] ?? ''

  return ['bar', 'line', 'area', 'pie'].map((type, i) => ({
    type,
    xAxis,
    yAxis: [(numericCols[i] ?? fallback)].filter(Boolean),
    series: '',
  }))
}
