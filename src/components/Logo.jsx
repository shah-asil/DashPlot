import { Link } from 'react-router-dom'

export function LogoIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoHexGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D9E75" />
          <stop offset="100%" stopColor="#185FA5" />
        </linearGradient>
      </defs>
      <polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="url(#logoHexGrad)" />
      <polyline
        points="6,16 10,16 12,11 14,18 16,13 18,16 22,16"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="13" r="1.5" fill="#EF9F27" />
    </svg>
  )
}

export function LogoWordmark({ to = '/', size = 'md' }) {
  const textSize = size === 'lg' ? 'text-xl' : 'text-base'
  const iconSize = size === 'lg' ? 36 : 28

  return (
    <Link to={to} className="flex items-center gap-2">
      <LogoIcon size={iconSize} />
      <span className={`${textSize} leading-none`}>
        <span className="font-bold text-navy" style={{ letterSpacing: '-0.2px' }}>Dash</span>
        <span className="font-normal text-teal" style={{ letterSpacing: '-0.2px' }}>Plot</span>
      </span>
    </Link>
  )
}
