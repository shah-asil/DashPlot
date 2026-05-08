import { Link } from 'react-router-dom'

export default function Guide() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-medium text-navy mb-2" style={{ letterSpacing: '-0.2px' }}>File preparation guide</h1>
      <p className="text-sm text-subtle mb-10">
        Get the best results from DashPlot by preparing your data file correctly. This guide covers the most common issues and how to fix them.
      </p>

      <Section title="Supported file types">
        <p>DashPlot accepts:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>.csv</strong> — comma-separated values (UTF-8 recommended)</li>
          <li><strong>.xlsx</strong> — Excel 2007 and later</li>
          <li><strong>.xls</strong> — Excel 97–2003</li>
        </ul>
        <p className="mt-2">Maximum file size: <strong>10 MB</strong>. For larger datasets, split your data or use Google Sheets sync (Pro plan).</p>
        <p className="mt-2 text-subtle">PDF, image files, and multi-sheet combining are not supported in v1.</p>
      </Section>

      <Section title="Headers: the golden rule">
        <p>Your <strong>first row must be column headers</strong>. Each header should be unique and descriptive. DashPlot uses headers to label chart axes and generate AI insights.</p>
        <GoodBad
          good={['Date,Product,Revenue,Units Sold', '2024-01-01,Widget A,1200,40', '2024-01-02,Widget B,950,31']}
          bad={['2024-01-01,Widget A,1200,40', '2024-01-02,Widget B,950,31']}
          goodLabel="Headers in row 1"
          badLabel="No headers — DashPlot can't label your data"
        />
      </Section>

      <Section title="Date formats">
        <p>Use ISO 8601 format (<code className="text-xs bg-mint px-1.5 py-0.5 rounded">YYYY-MM-DD</code>) wherever possible. DashPlot will attempt to standardise other common formats, but ISO is always safest.</p>
        <GoodBad
          good={['2024-01-15', '2024-03-07']}
          bad={['15/01/24', '7 March 2024']}
          goodLabel="ISO 8601 — always works"
          badLabel="Ambiguous formats — may be misread"
        />
      </Section>

      <Section title="Numeric columns">
        <p>Remove currency symbols, percent signs, and thousand separators from number columns before uploading. DashPlot will strip <code className="text-xs bg-mint px-1.5 py-0.5 rounded">£ $ €</code> automatically, but mixed formats (e.g., "$1,200" and "1200" in the same column) can cause issues.</p>
        <GoodBad
          good={['1200', '950', '14500']}
          bad={['$1,200', '£950', '14.500']}
          goodLabel="Plain numbers"
          badLabel="Mixed currency and formatting"
        />
      </Section>

      <Section title="Empty rows and merged cells">
        <p>Remove any empty rows or merged cells before uploading. Blank rows in the middle of data can truncate your chart. Merged cells in Excel headers confuse the column detector.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Delete all rows that are entirely blank.</li>
          <li>Unmerge any merged header cells in Excel (Home → Merge &amp; Center → Unmerge).</li>
          <li>Remove summary/total rows at the bottom if you don't want them in the chart.</li>
        </ul>
      </Section>

      <Section title="Column consistency">
        <p>Each column should contain only one type of data. A "Revenue" column should contain only numbers. A "Date" column should contain only dates. Mixing types in a column prevents DashPlot from detecting the correct chart axis.</p>
      </Section>

      <Section title="Special characters">
        <p>Avoid special characters in column headers: <code className="text-xs bg-mint px-1.5 py-0.5 rounded">/ \ : * ? " &lt; &gt; |</code>. Underscores and spaces are fine. Non-English characters in data cells are fully supported.</p>
      </Section>

      <Section title="CSV encoding">
        <p>Save your CSV as <strong>UTF-8</strong> to ensure special characters (accented letters, currency symbols) display correctly. In Excel: File → Save As → CSV UTF-8 (Comma delimited).</p>
      </Section>

      <Section title="Quick checklist before uploading">
        <ul className="space-y-2">
          {[
            'Row 1 contains unique column headers',
            'Dates are in YYYY-MM-DD format',
            'Number columns contain only numbers (no £, $, commas)',
            'No empty rows or merged cells',
            'File is under 10 MB',
            'CSV is saved as UTF-8',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <svg className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-12 p-6 bg-mint border border-teal-light rounded-card">
        <p className="text-sm text-ai-text">
          Still getting errors after following this guide? Email <a href="mailto:hello@dashplot.com" className="underline">hello@dashplot.com</a> and attach your file — we'll help you fix it within 24 hours.
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          to="/signup"
          className="text-sm text-white bg-teal px-6 py-3 rounded-pill hover:bg-opacity-90 transition-colors text-center min-h-[44px] flex items-center justify-center"
        >
          Start free trial
        </Link>
        <Link
          to="/faq"
          className="text-sm border border-teal-light bg-mint px-6 py-3 rounded-pill hover:bg-teal-light transition-colors text-center min-h-[44px] flex items-center justify-center"
          style={{ color: '#0F6E56' }}
        >
          Back to FAQ
        </Link>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-medium text-navy mb-3" style={{ letterSpacing: '-0.2px' }}>{title}</h2>
      <div className="text-sm text-subtle leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function GoodBad({ good, bad, goodLabel, badLabel }) {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-card border border-teal-light bg-mint p-3">
        <div className="text-xs text-teal font-medium mb-2">✓ {goodLabel}</div>
        {good.map((line, i) => (
          <div key={i} className="font-mono text-xs text-ai-text">{line}</div>
        ))}
      </div>
      <div className="rounded-card border border-red-200 bg-red-50 p-3">
        <div className="text-xs text-error font-medium mb-2">✗ {badLabel}</div>
        {bad.map((line, i) => (
          <div key={i} className="font-mono text-xs text-error opacity-80">{line}</div>
        ))}
      </div>
    </div>
  )
}
