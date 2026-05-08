export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-medium text-navy mb-2" style={{ letterSpacing: '-0.2px' }}>Privacy Policy</h1>
      <p className="text-sm text-subtle mb-10">Last updated: 1 May 2025</p>

      <Section title="1. Who we are">
        <p>DashPlot is operated by its founders and is governed by the laws of the Republic of Mauritius. References to "we", "us", or "our" mean DashPlot. Our contact email is <a href="mailto:shakhunasil@hotmail.com" className="text-teal hover:underline">shakhunasil@hotmail.com</a>.</p>
      </Section>

      <Section title="2. Data we collect">
        <p>We collect the following categories of personal data:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Account information: email address, display name, and password (hashed by Supabase).</li>
          <li>Uploaded data: CSV, Excel, and Google Sheets content you upload or connect to generate dashboards.</li>
          <li>Usage data: pages visited, features used, and events (collected via PostHog analytics).</li>
          <li>Billing data: Stripe handles all payment card data. We store only a Stripe customer ID.</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <p>We use your data to:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Provide and improve the DashPlot service.</li>
          <li>Generate AI-powered insights using the Anthropic Claude API. <strong>Your uploaded data may be transmitted to Anthropic's API.</strong> Anthropic's data processing terms apply.</li>
          <li>Send transactional emails (trial reminders, payment confirmations) via Resend.</li>
          <li>Analyse aggregate usage to improve our product.</li>
        </ul>
      </Section>

      <Section title="4. Legal bases (GDPR)">
        <p>For users in the European Economic Area, our legal bases are:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Contract performance:</strong> providing the service you signed up for.</li>
          <li><strong>Legitimate interests:</strong> product analytics and fraud prevention.</li>
          <li><strong>Consent:</strong> optional marketing communications.</li>
        </ul>
      </Section>

      <Section title="5. Data retention">
        <p>We retain your data for as long as your account is active. If your free trial expires and you do not upgrade, your account becomes read-only for 23 days, after which all data is permanently deleted (37 days from trial expiry). You may request earlier deletion by emailing <a href="mailto:shakhunasil@hotmail.com" className="text-teal hover:underline">shakhunasil@hotmail.com</a>.</p>
      </Section>

      <Section title="6. Third-party processors">
        <table className="w-full text-sm mt-2 border-collapse">
          <thead>
            <tr className="border-b border-mint">
              <th className="text-left py-2 text-subtle font-medium">Processor</th>
              <th className="text-left py-2 text-subtle font-medium">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Supabase', 'Database and authentication'],
              ['Anthropic', 'AI insight generation (Claude API)'],
              ['Stripe', 'Payment processing'],
              ['Resend', 'Transactional email'],
              ['PostHog', 'Product analytics'],
              ['Vercel', 'Hosting and CDN'],
            ].map(([name, purpose]) => (
              <tr key={name} className="border-b border-mint">
                <td className="py-2 font-medium text-navy">{name}</td>
                <td className="py-2 text-subtle">{purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="7. Cookies">
        <p>We use essential cookies for authentication and session management. We use PostHog analytics cookies to understand product usage. A cookie notice is shown on first visit for EU users. You may opt out of analytics cookies at any time via the cookie banner.</p>
      </Section>

      <Section title="8. Your rights">
        <p>You have the right to access, correct, or delete your personal data. To exercise these rights, email <a href="mailto:shakhunasil@hotmail.com" className="text-teal hover:underline">shakhunasil@hotmail.com</a>. We will respond within 30 days. This policy is compliant with the Mauritius Data Protection Act 2017 and GDPR.</p>
      </Section>

      <Section title="9. Contact">
        <p>For privacy questions, contact us at <a href="mailto:shakhunasil@hotmail.com" className="text-teal hover:underline">shakhunasil@hotmail.com</a>.</p>
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
