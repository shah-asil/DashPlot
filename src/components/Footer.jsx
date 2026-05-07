import { Link } from 'react-router-dom'
import { LogoIcon } from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-mint bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LogoIcon size={24} />
              <span className="text-base">
                <span className="font-bold text-navy">Dash</span>
                <span className="font-normal text-teal">Plot</span>
              </span>
            </div>
            <p className="text-xs text-subtle tracking-tagline uppercase mt-1">Upload. Analyse. Share.</p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-subtle">
            <Link to="/faq" className="hover:text-teal transition-colors">FAQ</Link>
            <Link to="/guide" className="hover:text-teal transition-colors">Guide</Link>
            <Link to="/privacy" className="hover:text-teal transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-teal transition-colors">Terms</Link>
          </nav>
        </div>

        <div className="mt-8 pt-8 border-t border-mint flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-subtle">
          <span>© {new Date().getFullYear()} DashPlot. All rights reserved.</span>
          <span>Governing law: Republic of Mauritius</span>
        </div>
      </div>
    </footer>
  )
}
