import React from 'react';

export function Sheet({
  open,
  onClose,
  children,
  title,
  sub,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  sub?: string;
  tall?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-center">
      <div className="relative flex w-full max-w-[520px] flex-col justify-end">
        <div className="absolute inset-0 bg-[rgba(12,10,14,0.55)] fade-in" onClick={onClose} />
        <div
          className={`relative paper paper-edge sheet-enter rounded-t-[26px] ${
            tall ? 'max-h-[92%]' : 'max-h-[80%]'
          } flex flex-col`}
        >
        <div className="flex-none px-5 pt-3 pb-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgba(43,36,25,0.22)]" />
          {title && (
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="display text-[21px] font-semibold leading-tight text-[#2b2419]">{title}</h2>
                {sub && <p className="ui mt-0.5 text-[12px] text-[#5f5544]">{sub}</p>}
              </div>
              <button
                onClick={onClose}
                className="ui btn btn-quiet h-8 px-3 text-[12px]"
                aria-label="close"
              >
                收起
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sheet-body no-scrollbar">
          {children}
        </div>
        </div>
      </div>
    </div>
  );
}

export function Chip({
  children,
  tone = 'ink',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'ink' | 'brass' | 'wine' | 'moss' | 'ghost';
  className?: string;
}) {
  const map: Record<string, string> = {
    ink: 'bg-[rgba(43,36,25,0.08)] text-[#4a4032] border-[rgba(43,36,25,0.16)]',
    brass: 'bg-[rgba(184,135,63,0.16)] text-[#8a6220] border-[rgba(184,135,63,0.35)]',
    wine: 'bg-[rgba(123,59,70,0.13)] text-[#7b3b46] border-[rgba(123,59,70,0.3)]',
    moss: 'bg-[rgba(92,106,69,0.14)] text-[#4d5a38] border-[rgba(92,106,69,0.32)]',
    ghost: 'bg-transparent text-[#6a5f4c] border-[rgba(43,36,25,0.14)]',
  };
  return (
    <span
      className={`ui inline-flex items-center rounded-full border px-2 py-[2px] text-[10.5px] leading-none ${map[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = '',
  onClick,
  active,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border p-3 transition-all ${
        active
          ? 'border-[rgba(184,135,63,0.75)] bg-[rgba(217,174,99,0.14)] shadow-[0_6px_18px_-10px_rgba(168,116,40,0.8)]'
          : 'border-[rgba(43,36,25,0.13)] bg-[rgba(255,253,246,0.62)]'
      } ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Meter({
  value,
  max,
  tone = '#b8873f',
  /** a second, dimmer fill drawn behind the main one — used to show the
      reduced-efficiency floor once stamina is spent, so a zero-length bar
      still carries information instead of looking broken */
  ghost = 0,
}: {
  value: number;
  max: number;
  tone?: string;
  ghost?: number;
}) {
  const p = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const g = Math.max(0, Math.min(1, ghost));
  return (
    <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[rgba(43,36,25,0.14)]">
      {g > 0 && (
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{
            width: `${g * 100}%`,
            background: `repeating-linear-gradient(90deg, ${tone} 0 3px, transparent 3px 6px)`,
            opacity: 0.55,
          }}
        />
      )}
      <div
        className="relative h-full rounded-full transition-all duration-500"
        style={{ width: `${p * 100}%`, background: tone }}
      />
    </div>
  );
}

export function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  const s = size;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', className } as const;
  switch (name) {
    case 'coin':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8.2v7.6M9.6 10.2h4.8M9.6 13.8h4.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...common}>
          <path
            d="M12 3.6l1.7 4.9 4.9 1.7-4.9 1.7L12 16.8l-1.7-4.9L5.4 10.2l4.9-1.7L12 3.6zM18.4 15.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'fame':
      return (
        <svg {...common}>
          <path
            d="M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'leisure':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 7.4V12l3.2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'lyre':
      return (
        <svg {...common}>
          <path
            d="M7 20c3.6-1 6.4-3.8 7.4-7.4C15.4 9 17.2 7 20 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8.6" cy="17.6" r="3.1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path
            d="M4 6.6l5-1.8 6 2 5-1.8v11.4l-5 1.8-6-2-5 1.8V6.6z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9 4.8v13.2M15 6.8V20" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    /* the travel sheet and the explore tab both used to be a folded map,
       which made two very different destinations look like one */
    case 'compass':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14.9 9.1l-1.7 4.1-4.1 1.7 1.7-4.1 4.1-1.7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path
            d="M5 4.8h5.2c1 0 1.8.8 1.8 1.8v12.6c0-1-.8-1.8-1.8-1.8H5V4.8zM19 4.8h-5.2c-1 0-1.8.8-1.8 1.8v12.6c0-1 .8-1.8 1.8-1.8H19V4.8z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'bag':
      return (
        <svg {...common}>
          <path
            d="M6 8.4h12l-1.1 10.2a1.8 1.8 0 01-1.8 1.6H8.9a1.8 1.8 0 01-1.8-1.6L6 8.4z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M9.2 8.4V6.6a2.8 2.8 0 015.6 0v1.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path
            d="M2.8 12S6 6.2 12 6.2 21.2 12 21.2 12 18 17.8 12 17.8 2.8 12 2.8 12z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'gear':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M12 3.6v2.2M12 18.2v2.2M4.8 12H2.6M21.4 12h-2.2M6.9 6.9L5.3 5.3M18.7 18.7l-1.6-1.6M17.1 6.9l1.6-1.6M5.3 18.7l1.6-1.6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function Divider({ label }: { label?: string }) {
  if (!label)
    return <div className="rule my-4" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="rule flex-1" />
      <span className="ui text-[10px] tracking-wider-2 text-[#6f6350] uppercase">{label}</span>
      <div className="rule flex-1" />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(43,36,25,0.2)] px-4 py-8 text-center">
      <p className="ui text-[12.5px] leading-relaxed text-[#6a5f4c]">{children}</p>
    </div>
  );
}
