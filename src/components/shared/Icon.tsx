import * as React from 'react';

type IconName =
  | 'home' | 'calendar' | 'user' | 'plus' | 'arrow-right' | 'arrow-left'
  | 'chevron-right' | 'chevron-down' | 'check' | 'close' | 'clock'
  | 'phone' | 'mail' | 'bell' | 'cash' | 'bag' | 'users' | 'scissors'
  | 'search' | 'star' | 'more' | 'settings';

export function Icon({
  name, size = 20, stroke = 1.7, color = 'currentColor', className
}: { name: IconName; size?: number; stroke?: number; color?: string; className?: string }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color,
    strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className
  };
  switch (name) {
    case 'home': return (<svg {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>);
    case 'calendar': return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>);
    case 'user': return (<svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 5-6 8-6s7 2 8 6"/></svg>);
    case 'plus': return (<svg {...p}><path d="M12 5v14M5 12h14"/></svg>);
    case 'arrow-right': return (<svg {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>);
    case 'arrow-left': return (<svg {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></svg>);
    case 'chevron-right': return (<svg {...p}><path d="M9 6l6 6-6 6"/></svg>);
    case 'chevron-down': return (<svg {...p}><path d="M6 9l6 6 6-6"/></svg>);
    case 'check': return (<svg {...p}><path d="M5 12l5 5L20 7"/></svg>);
    case 'close': return (<svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>);
    case 'clock': return (<svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case 'phone': return (<svg {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>);
    case 'mail': return (<svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>);
    case 'bell': return (<svg {...p}><path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/></svg>);
    case 'cash': return (<svg {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>);
    case 'bag': return (<svg {...p}><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/></svg>);
    case 'users': return (<svg {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-3 4-5 7-5s6 2 7 5"/><circle cx="17" cy="7" r="2.5"/><path d="M22 19c-.5-2-2-3.5-4-4"/></svg>);
    case 'scissors': return (<svg {...p}><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>);
    case 'search': return (<svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>);
    case 'star': return (<svg {...p}><path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z"/></svg>);
    case 'more': return (<svg {...p}><circle cx="5" cy="12" r="1.3" fill={color}/><circle cx="12" cy="12" r="1.3" fill={color}/><circle cx="19" cy="12" r="1.3" fill={color}/></svg>);
    case 'settings': return (<svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>);
    default: return null;
  }
}
