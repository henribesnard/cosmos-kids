import type { Locale } from '../data/types';

interface FooterProps {
  readonly locale: Locale;
  readonly onParents: () => void;
}

export function Footer({ locale, onParents }: FooterProps) {
  return (
    <footer className="site-footer" data-scene-obstacle>
      <span className="site-footer__mark" aria-hidden="true" />
      <span className="site-footer__text">COSMOS KIDS {new Date().getFullYear()}</span>
      <button className="site-footer__link" type="button" onClick={onParents}>
        {locale === 'fr' ? 'Nova : infos parents' : 'Nova: parents’ info'}
      </button>
    </footer>
  );
}
