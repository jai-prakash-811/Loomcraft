const paths = {
  heart: <path d="M12 20.5S3.5 15.6 3.5 9.4A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 8.5 2.8c0 6.2-8.5 11.1-8.5 11.1z" />,
  bag: <g><path d="M5.5 8h13l1 12.5h-15z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></g>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  truck: <g><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17" cy="17.5" r="1.7" /></g>,
  refresh: <path d="M20 11a8 8 0 1 0-2.4 5.7M20 4.5V11h-6.5" />,
  hand: <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1-6 6h-.5a6 6 0 0 1-4.6-2.2L4 15.5a1.6 1.6 0 0 1 2.4-2.1L8 15" />,
  lock: <g><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></g>,
  logout: <path d="M10 4.5H5.5v15H10M15 8l4 4-4 4M19 12H9.5" />,
  box: <path d="M3.5 8L12 3.5 20.5 8v8L12 20.5 3.5 16zM3.5 8L12 12.5 20.5 8M12 12.5v8" />,
  pin: <g><path d="M12 21s6-5.5 6-10.5a6 6 0 0 0-12 0C6 15.5 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.2" /></g>
};

export default function Icon({ name, size = 20, filled = false, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
