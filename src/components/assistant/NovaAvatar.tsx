import { useId } from 'react';

/**
 * Nova's moods. Each one maps to a distinct, readable pose of the probe so
 * that the state is never conveyed only by colour or motion.
 */
export type NovaMood =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'verifying'
  | 'happy'
  | 'mystery'
  | 'recharging'
  | 'caring'
  | 'shield'
  | 'oops'
  | 'offline'
  | 'elsewhere';

interface NovaAvatarProps {
  readonly mood?: NovaMood;
  readonly size?: number;
  readonly className?: string;
}

/**
 * Nova — an original little co-pilot probe: a round hull with a single visor
 * eye, a star-tipped antenna, two folding solar panels and a tilted orbit ring.
 * Purely decorative (aria-hidden): every state is also spelled out in text.
 */
export function NovaAvatar({ mood = 'idle', size = 56, className = '' }: NovaAvatarProps) {
  const uid = useId().replace(/:/g, '');
  const hull = `nova-hull-${uid}`;
  const ring = `nova-ring-${uid}`;
  const glow = `nova-glow-${uid}`;

  return (
    <svg
      className={`nova-av nova-av--${mood} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={hull} cx="36%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f2feff" />
          <stop offset=".38" stopColor="#7eeaff" />
          <stop offset=".78" stopColor="#3b78ff" />
          <stop offset="1" stopColor="#5a3fd1" />
        </radialGradient>
        <linearGradient id={ring} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#63e6ff" />
          <stop offset="1" stopColor="#a67bff" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#63e6ff" stopOpacity=".55" />
          <stop offset="1" stopColor="#63e6ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="nova-av__halo" cx="40" cy="42" r="34" fill={`url(#${glow})`} />

      <g className="nova-av__float">
        {/* back half of the orbit ring */}
        <ellipse className="nova-av__ring-back" cx="40" cy="45" rx="31" ry="8.5" fill="none" stroke={`url(#${ring})`} strokeWidth="1.6" opacity=".45" transform="rotate(-12 40 45)" />

        {/* solar panels */}
        <g className="nova-av__panels">
          <g className="nova-av__panel nova-av__panel--left">
            <path d="M22 41h-5" stroke="#9fdcff" strokeWidth="1.6" />
            <rect x="5" y="35" width="12" height="13" rx="2" fill="#0b2050" stroke="#63e6ff" strokeWidth="1.2" />
            <path d="M5 41.5h12M11 35v13" stroke="#63e6ff" strokeWidth=".7" opacity=".7" />
          </g>
          <g className="nova-av__panel nova-av__panel--right">
            <path d="M58 41h5" stroke="#9fdcff" strokeWidth="1.6" />
            <rect x="63" y="35" width="12" height="13" rx="2" fill="#0b2050" stroke="#a67bff" strokeWidth="1.2" />
            <path d="M63 41.5h12M69 35v13" stroke="#a67bff" strokeWidth=".7" opacity=".7" />
          </g>
        </g>

        {/* antenna */}
        <g className="nova-av__antenna">
          <path className="nova-av__beam" d="M40 9 L22 -6 L58 -6 Z" fill="#63e6ff" opacity=".22" />
          <path d="M40 23V12" stroke="#bfefff" strokeWidth="1.8" strokeLinecap="round" />
          <path className="nova-av__tip" d="M40 4.6l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#fff6c9" stroke="#ffd98a" strokeWidth=".6" />
          {mood === 'offline' && <path d="M35 4l10 12" stroke="#ff9f8a" strokeWidth="1.8" strokeLinecap="round" />}
        </g>

        {/* hull */}
        <circle cx="40" cy="41" r="18.5" fill={`url(#${hull})`} />
        <path d="M27 33a15 15 0 0 1 10-8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".55" fill="none" />

        {/* visor */}
        <rect x="27.5" y="34" width="25" height="13.5" rx="6.75" fill="#061226" stroke="#baf5ff" strokeOpacity=".55" strokeWidth="1" />
        <g className="nova-av__eye">{renderEye(mood)}</g>

        {/* front half of the orbit ring */}
        <path className="nova-av__ring-front" d="M9.6 51.3 A31 8.5 0 0 0 70.4 38.7" fill="none" stroke={`url(#${ring})`} strokeWidth="2" strokeLinecap="round" transform="rotate(-12 40 45)" />

        {renderAccessory(mood)}
      </g>
    </svg>
  );
}

function renderEye(mood: NovaMood) {
  switch (mood) {
    case 'happy':
      return <path d="M34.5 43 Q40 35.5 45.5 43" fill="none" stroke="#63e6ff" strokeWidth="2.6" strokeLinecap="round" />;
    case 'caring':
      return <path d="M34.5 39.5 Q40 44.5 45.5 39.5" fill="none" stroke="#9eeeff" strokeWidth="2.4" strokeLinecap="round" />;
    case 'recharging':
      return (
        <>
          <path d="M34 41.5h12" stroke="#63e6ff" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M34.5 39.6 Q40 37.8 45.5 39.6" stroke="#63e6ff" strokeWidth="1" fill="none" opacity=".5" />
        </>
      );
    case 'oops':
      return <path d="M33.5 41 q1.6-2.4 3.2 0 t3.2 0 t3.2 0 t3.2 0" fill="none" stroke="#63e6ff" strokeWidth="2" strokeLinecap="round" />;
    case 'offline':
      return <circle cx="40" cy="41" r="3" fill="#56657f" />;
    case 'mystery':
      return (
        <>
          <circle className="nova-av__pupil" cx="41.5" cy="40.5" r="3.1" fill="#a67bff" />
          <path d="M33 31.5 L39 29.5" stroke="#baf5ff" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case 'thinking':
      return <circle className="nova-av__pupil" cx="44" cy="38.6" r="3.4" fill="#63e6ff" />;
    case 'elsewhere':
      return (
        <>
          <circle className="nova-av__pupil" cx="46.5" cy="39.4" r="3.4" fill="#63e6ff" />
          <circle cx="47.6" cy="38.3" r="1" fill="#fff" opacity=".9" />
        </>
      );
    case 'verifying':
      return <circle className="nova-av__pupil" cx="40" cy="40.7" r="4.4" fill="#63e6ff" />;
    default:
      return (
        <>
          <circle className="nova-av__pupil" cx="40" cy="40.7" r="3.7" fill="#63e6ff" />
          <circle cx="41.4" cy="39.3" r="1.1" fill="#fff" opacity=".9" />
        </>
      );
  }
}

function renderAccessory(mood: NovaMood) {
  switch (mood) {
    case 'listening':
      return (
        <g className="nova-av__waves" fill="none" stroke="#63e6ff" strokeWidth="1.4" strokeLinecap="round">
          <path d="M60 30a10 10 0 0 1 0 12" />
          <path d="M64 27a15 15 0 0 1 0 18" opacity=".6" />
        </g>
      );
    case 'thinking':
      return (
        <g className="nova-av__dots" fill="#baf5ff">
          <circle cx="58" cy="22" r="1.8" />
          <circle cx="64" cy="16" r="2.3" />
          <circle cx="71" cy="10" r="2.8" />
        </g>
      );
    case 'verifying':
      return (
        <g className="nova-av__lens">
          <circle cx="40" cy="40.7" r="8.5" fill="none" stroke="#fff6c9" strokeWidth="2" />
          <path d="M46 47l7 7" stroke="#fff6c9" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'happy':
      return (
        <g className="nova-av__sparkles" fill="#fff6c9">
          <path d="M66 14l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" />
          <path d="M13 20l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" />
        </g>
      );
    case 'mystery':
      return (
        <text className="nova-av__question" x="60" y="24" fill="#c9b2ff" fontSize="17" fontWeight="700" fontFamily="'Space Grotesk', sans-serif">?</text>
      );
    case 'recharging':
      return (
        <g className="nova-av__battery">
          <rect x="31" y="62" width="16" height="8" rx="2" fill="#061226" stroke="#67e7bd" strokeWidth="1.2" />
          <rect x="47.5" y="64.5" width="2" height="3" rx=".6" fill="#67e7bd" />
          <rect className="nova-av__charge" x="33" y="64" width="12" height="4" rx="1" fill="#67e7bd" />
        </g>
      );
    case 'shield':
      return (
        <g className="nova-av__shield">
          <path d="M57 50l8-3 8 3v6c0 5-3.6 8.4-8 10-4.4-1.6-8-5-8-10z" fill="#0b2050" stroke="#67e7bd" strokeWidth="1.4" />
          <rect x="61.5" y="55" width="7" height="5.5" rx="1" fill="#67e7bd" />
          <path d="M63 55v-1.6a2 2 0 0 1 4 0V55" fill="none" stroke="#67e7bd" strokeWidth="1.2" />
        </g>
      );
    case 'caring':
      return <path className="nova-av__heart" d="M64 18c-1.5-2.5-5.5-1.6-5.5 1.3 0 2.6 5.5 5.7 5.5 5.7s5.5-3.1 5.5-5.7c0-2.9-4-3.8-5.5-1.3z" fill="#ffb3c7" opacity=".85" />;
    case 'elsewhere':
      return (
        <g className="nova-av__far-planet">
          <circle cx="68" cy="16" r="5" fill="#ffb35c" opacity=".9" />
          <ellipse cx="68" cy="16" rx="9" ry="2.4" fill="none" stroke="#ffd9a8" strokeWidth="1.2" transform="rotate(-18 68 16)" />
        </g>
      );
    case 'oops':
      return <path d="M58 27c0 2.4 3.4 2.4 3.4 0 0-1.6-1.7-3.6-1.7-3.6S58 25.4 58 27z" fill="#9fdcff" />;
    default:
      return null;
  }
}
