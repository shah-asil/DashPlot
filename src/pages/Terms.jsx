export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-medium text-navy mb-2" style={{ letterSpacing: '-0.2px' }}>Terms of Service</h1>
      <p className="text-sm text-subtle mb-10">Last updated: 1 May 2025</p>

      <Section title="1. Acceptance">
        <p>By creating an account or using DashPlot, you agree to these Terms of Service. If you do not agree, do not use the service. These terms are governed by the laws of the Republic of Mauritius.</p>
      </Section>

      <Section title="2. Service description">
        <p>DashPlot is an AI-powered data visualisation service. You upload data files (CSV, Excel) or connect Google Sheets; DashPlot generates charts and AI-written narrative summaries, and provides shareable dashboard links.</p>
      </Section>

      <Section title="3. Free trial">
        <p>New accounts receive a 14-day free trial with access to limited features (up to 3 reports, bar and line charts, first sentence of AI insight). No credit card is required to start a trial. After the trial ends, your account becomes read-only. Data is permanently deleted 37 days after trial expiry.</p>
      </Section>

      <Section title="4. Subscriptions and billing">
        <p>Paid plans (Solo, Pro, Agency) are billed monthly or annually via Stripe. Annual billing is equivalent to 10 months at the monthly rate. You may cancel at any time; access continues until the end of the current billing period. Refunds are not provided for partial periods.</p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You may not:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Upload data you do not have the right to process.</li>
          <li>Use DashPlot to process special categories of personal data (health, biometric, etc.) without express consent.</li>
          <li>Attempt to reverse-engineer, scrape, or abuse the service.</li>
          <li>Use DashPlot for unlawful purposes.</li>
        </ul>
      </Section>

      <Section title="6. Your data">
        <p>You retain ownership of all data you upload. By uploading, you grant DashPlot a limited, non-exclusive licence to process your data solely to provide the service. We do not sell or share your data with third parties except as described in the Privacy Policy.</p>
      </Section>

      <Section title="7. AI-generated content">
        <p>DashPlot uses the Anthropic Claude API to generate narrative summaries. AI-generated content is provided for informational purposes only. It may contain errors. You are responsible for validating any business decisions made based on AI insights.</p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>DashPlot is provided "as is." To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from use of the service. Our total liability shall not exceed the amounts paid by you in the 3 months preceding the claim.</p>
      </Section>

      <Section title="9. Modifications">
        <p>We may update these terms at any time. We will notify you by email at least 14 days before material changes take effect. Continued use after that date constitutes acceptance.</p>
      </Section>

      <Section title="10. Governing law">
        <p>These terms are governed by the laws of the Republic of Mauritius. Disputes shall be subject to the exclusive jurisdiction of the courts of Mauritius.</p>
      </Section>

      <Section title="11. Contact">
        <p>For questions about these terms, contact <a href="mailto:hello@dashplot.com" className="text-teal hover:underline">hello@dashplot.com</a>.</p>
      </Section>
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
