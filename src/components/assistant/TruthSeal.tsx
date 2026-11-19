import { useEffect, useId, useRef, useState } from 'react';
import type { AssistantClaim, AssistantSource, ClaimStatus } from '../../assistant/types';
import type { Locale } from '../../data/types';
import { NOVA_TEXT } from './novaText';
import { isSafeUrl } from './novaUtils';

/** Distinct glyph per status: the shape carries meaning, not only the colour. */
export function SealGlyph({ status, size = 18 }: { status: ClaimStatus; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false } as const;
  if (status === 'verified') {
    return (
      <svg {...common}>
        <path d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m8 12 3 3 5-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'debated') {
    return (
      <svg {...common}>
        <path d="M12 4v16M7 20h10M5 7h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M5 7 2.5 13h5zM19 7l-2.5 6h5z" fill="currentColor" opacity=".25" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 2.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 15.8l-5.4 3 1.2-6.1-4.5-4.2 6.1-.7z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10.3 9.6a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3M12 14.2v.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Small inline status label used for each claim inside the sources panel. */
export function ClaimTag({ status, locale }: { status: ClaimStatus; locale: Locale }) {
  return (
    <span className={`nova-claim-tag nova-claim-tag--${status}`}>
      <SealGlyph status={status} size={14} />
      {NOVA_TEXT[locale].seal[status]}
    </span>
  );
}

interface TruthSealProps {
  readonly status: ClaimStatus;
  readonly claims: readonly AssistantClaim[];
  readonly sources: readonly AssistantSource[];
  readonly locale: Locale;
}

/**
 * The "seal of truth": a badge that differs by colour, shape AND text,
 * a one-line explanation, and a disclosure revealing claims and sources.
 */
export function TruthSeal({ status, claims, sources, locale }: TruthSealProps) {
  const t = NOVA_TEXT[locale];
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Bring the unfolded sources into view inside the scrolling conversation.
  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [open]);
  const sourceIndex = new Map(sources.map((source, index) => [source.id, index + 1]));

  return (
    <div className={`nova-seal nova-seal--${status}`}>
      <button
        type="button"
        className="nova-seal__badge"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <SealGlyph status={status} />
        <span className="nova-seal__label">{t.seal[status]}</span>
        <span className="nova-seal__toggle">{open ? t.hideSources : t.showSources}</span>
        <svg className="nova-seal__chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <p className="nova-seal__explain">{t.sealExplain[status]}</p>

      <div className="nova-seal__panel" id={panelId} ref={panelRef} hidden={!open}>
        {claims.length > 0 && (
          <>
            <h4>{t.claimsTitle}</h4>
            <ul className="nova-seal__claims">
              {claims.map((claim) => (
                <li key={claim.text}>
                  <ClaimTag status={claim.status} locale={locale} />
                  <span>{claim.text}</span>
                  {claim.sourceIds.length > 0 && (
                    <span className="nova-seal__refs">
                      {claim.sourceIds
                        .map((id) => sourceIndex.get(id))
                        .filter((value): value is number => value !== undefined)
                        .map((value) => `[${value}]`)
                        .join(' ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        <h4>{t.sourcesTitle}</h4>
        {sources.length === 0 ? (
          <p className="nova-seal__empty">{t.noSources}</p>
        ) : (
          <ol className="nova-seal__sources">
            {sources.map((source, index) => (
              <li key={source.id} className={`nova-source nova-source--${source.kind}`}>
                <span className="nova-source__num" aria-hidden="true">{index + 1}</span>
                <div>
                  {source.kind === 'catalog' ? (
                    <>
                      <b>{t.catalogName}</b>
                      <small>{t.catalogFrom(source.publisher)}</small>
                    </>
                  ) : (
                    <b>{source.publisher}</b>
                  )}
                  <span className="nova-source__title">{source.title}</span>
                  {isSafeUrl(source.url) && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {t.openSource} <span className="sr-only">{t.newTab}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
