import type { SVGProps } from 'react';

export type IconName =
  | 'arrow'
  | 'arrow-left'
  | 'blackhole'
  | 'calendar'
  | 'check'
  | 'close'
  | 'compare'
  | 'earth'
  | 'galaxy'
  | 'info'
  | 'mission'
  | 'nebula'
  | 'orbit'
  | 'pause'
  | 'play'
  | 'search'
  | 'settings'
  | 'sparkle'
  | 'volume';

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6m6 6H3" />,
  'arrow-left': <path d="m15 18-6-6 6-6M9 12h12" />,
  blackhole: <><circle cx="12" cy="12" r="3" fill="currentColor" /><ellipse cx="12" cy="12" rx="10" ry="3.5" /><path d="M4 6c2 2 5 3 8 3s6-1 8-3M4 18c2-2 5-3 8-3s6 1 8 3" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  compare: <path d="M8 4v16M16 4v16M4 8h8M12 16h8" />,
  earth: <><circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3c2.3 2.3 3.5 5.3 3.5 9S14.3 18.7 12 21c-2.3-2.3-3.5-5.3-3.5-9S9.7 5.3 12 3Z" /></>,
  galaxy: <><ellipse cx="12" cy="12" rx="10" ry="4" /><path d="M6 8c2.5-2 7-2 10 0M8 16c2.5 2 5 2 8 0" /><circle cx="12" cy="12" r="2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
  mission: <><path d="M8 3h8l1 3h3v15H4V6h3l1-3Z" /><path d="M8 11h8M8 15h6" /></>,
  nebula: <><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>,
  orbit: <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(28 12 12)" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  sparkle: <path d="m12 2 1.4 5.2L18 10l-4.6 2.8L12 18l-1.4-5.2L6 10l4.6-2.8L12 2Zm6 14 .7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7L18 16Z" />,
  volume: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9c1 1 1 5 0 6M19 6c3 3 3 9 0 12" /></>,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {paths[name]}
      </g>
    </svg>
  );
}

