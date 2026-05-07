import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center"
      style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #E6F1FB 100%)' }}
    >
      <div className="text-6xl font-medium text-teal-light" style={{ letterSpacing: '-0.2px' }}>404</div>
      <h1 className="text-2xl font-medium text-navy mt-4" style={{ letterSpacing: '-0.2px' }}>Page not found</h1>
      <p className="text-sm text-subtle mt-3 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <Link
          to="/"
          className="text-sm text-white bg-teal px-8 py-3 rounded-pill hover:bg-opacity-90 transition-colors min-h-[44px] flex items-center justify-center"
        >
          Back to home
        </Link>
        <Link
          to="/signup"
          className="text-sm border border-teal-light bg-white px-8 py-3 rounded-pill hover:bg-mint transition-colors min-h-[44px] flex items-center justify-center"
          style={{ color: '#0F6E56' }}
        >
          Try DashPlot free
        </Link>
      </div>
    </div>
  )
}
