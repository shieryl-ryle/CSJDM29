/** Message from the developer, with an anonymous hooded-programmer icon (inline SVG, no external assets). */
export function ProgrammerIcon({ size = 80 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label="Anonymous developer" className="shrink-0">
      <defs>
        <clipPath id="dev-clip">
          <circle cx="48" cy="48" r="45" />
        </clipPath>
      </defs>
      <circle cx="48" cy="48" r="46" fill="#0a0a0a" stroke="#c1121f" strokeWidth="3" />
      <g clipPath="url(#dev-clip)">
        {/* shoulders */}
        <path d="M10 96 C12 70 28 60 48 60 C68 60 84 70 86 96 Z" fill="#2a2a2a" />
        {/* hood */}
        <path d="M48 14 C31 14 22 27 22 43 C22 52 25 58 29 63 L67 63 C71 58 74 52 74 43 C74 27 65 14 48 14 Z" fill="#2a2a2a" stroke="#c1121f" strokeWidth="2" />
        {/* face void */}
        <ellipse cx="48" cy="44" rx="16" ry="18" fill="#0a0a0a" />
        <text x="48" y="50" textAnchor="middle" fontFamily="ui-monospace, Menlo, Consolas, monospace" fontSize="15" fontWeight="700" fill="#c1121f">{"</>"}</text>
        {/* laptop */}
        <rect x="30" y="72" width="36" height="20" rx="3" fill="#f1f1f1" />
        <circle cx="48" cy="82" r="2.4" fill="#c1121f" />
      </g>
    </svg>
  );
}

export function DeveloperNote({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="dev-note" className={`card border-l-4 border-l-brand-600 ${className}`}>
      <h2 id="dev-note" className="text-xs font-bold uppercase tracking-wide text-ink-500">Message from the developer</h2>
      <div className="mt-3 flex items-start gap-4">
        <ProgrammerIcon />
        <div className="space-y-2 text-ink-900">
          <p className="font-semibold">&ldquo;Condolences to the bereaved furparents.&rdquo;</p>
          <p>
            &ldquo;I am not affiliated with any organization. I am just a furmom who sympathizes with the victims.
            <br />
            Love, Chilli&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
