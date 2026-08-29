import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface MissionStep {
  id: string;
  label: { fr: string; en: string };
  detail: { fr: string; en: string };
}

const steps: MissionStep[] = [
  { id: 'earth', label: { fr: 'Retrouver la Terre', en: 'Find Earth' }, detail: { fr: 'Notre point de départ', en: 'Our starting point' } },
  { id: 'moon', label: { fr: 'Visiter la Lune', en: 'Visit the Moon' }, detail: { fr: 'Le satellite de la Terre', en: "Earth's moon" } },
  { id: 'mars', label: { fr: 'Observer Mars', en: 'Observe Mars' }, detail: { fr: 'La planète rouge', en: 'The red planet' } },
  { id: 'saturn', label: { fr: 'Trouver les anneaux', en: 'Find the rings' }, detail: { fr: 'Le secret de Saturne', en: "Saturn's secret" } },
];

interface MissionPanelProps {
  locale: Locale;
  visited: string[];
  open: boolean;
  onClose: () => void;
  onTravel: (id: string) => void;
}

export function MissionPanel({ locale, visited, open, onClose, onTravel }: MissionPanelProps) {
  const fr = locale === 'fr';
  const complete = steps.filter((step) => visited.includes(step.id)).length;
  const percent = Math.round((complete / steps.length) * 100);

  return (
    <aside className={`mission-panel glass-panel ${open ? 'is-open' : ''}`} aria-label={fr ? 'Mission en cours' : 'Current mission'}>
      <div className="panel-heading">
        <div>
          <p className="panel-kicker"><Icon name="mission" size={15} /> {fr ? 'MISSION 01' : 'MISSION 01'}</p>
          <h2>{fr ? 'Notre voisinage spatial' : 'Our space neighbourhood'}</h2>
        </div>
        <button className="icon-button mission-panel__close" type="button" onClick={onClose} aria-label={fr ? 'Fermer la mission' : 'Close mission'}>
          <Icon name="close" />
        </button>
      </div>

      <ol className="mission-list">
        {steps.map((step, index) => {
          const done = visited.includes(step.id);
          return (
            <li className={done ? 'is-done' : ''} key={step.id}>
              <button type="button" onClick={() => onTravel(step.id)}>
                <span className="mission-check">{done ? <Icon name="check" size={14} /> : index + 1}</span>
                <span><b>{step.label[locale]}</b><small>{step.detail[locale]}</small></span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mission-progress" aria-label={`${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="mission-reward">
        <span aria-hidden="true">🏅</span>
        <span><small>{fr ? 'RÉCOMPENSE' : 'REWARD'}</small><b>{fr ? 'Explorateur du Système solaire' : 'Solar System Explorer'}</b></span>
      </div>
    </aside>
  );
}

