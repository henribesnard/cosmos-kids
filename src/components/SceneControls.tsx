import { useRef, useState } from 'react';
import type { Locale } from '../app/uiTypes';
import { Icon } from './Icon';

interface SceneControlsProps {
  locale: Locale;
  showLabels: boolean;
  showOrbits: boolean;
  timeScale: number;
  snapshotDate: string | null;
  onLabels: () => void;
  onOrbits: () => void;
  onTimeScale: (value: number) => void;
  onSnapshotDate: (date: string | null) => void;
}

const speeds = [0, 1, 10, 100] as const;

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export function SceneControls({ locale, showLabels, showOrbits, timeScale, snapshotDate, onLabels, onOrbits, onTimeScale, onSnapshotDate }: SceneControlsProps) {
  const fr = locale === 'fr';
  const currentIndex = Math.max(0, speeds.indexOf(timeScale as (typeof speeds)[number]));
  const nextSpeed = speeds[(currentIndex + 1) % speeds.length] ?? 1;
  const [dateOpen, setDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (value: string) => {
    if (!value) {
      onSnapshotDate(null);
      return;
    }
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isNaN(date.getTime())) {
      onSnapshotDate(date.toISOString());
    }
  };

  const setToday = () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    onSnapshotDate(today.toISOString());
  };

  return (
    <div className="scene-controls glass-panel" aria-label={fr ? 'Contrôles de la scène' : 'Scene controls'}>
      <button className={showOrbits ? 'is-active' : ''} type="button" onClick={onOrbits} aria-pressed={showOrbits}>
        <Icon name="orbit" size={17} /> <span>{fr ? 'Orbites' : 'Orbits'}</span>
      </button>
      <button className={showLabels ? 'is-active' : ''} type="button" onClick={onLabels} aria-pressed={showLabels}>
        <span aria-hidden="true" className="label-icon">Aa</span> <span>{fr ? 'Noms' : 'Names'}</span>
      </button>
      <span className="scene-controls__divider" />
      <button
        type="button"
        onClick={() => { if (snapshotDate) { onSnapshotDate(null); onTimeScale(1); } else { onTimeScale(nextSpeed); } }}
        aria-label={fr ? `Vitesse du temps fois ${timeScale}` : `Time speed times ${timeScale}`}
      >
        <Icon name={timeScale === 0 ? 'play' : 'pause'} size={16} /> <span>{timeScale === 0 ? (fr ? 'En pause' : 'Paused') : `×${timeScale}`}</span>
      </button>
      <span className="scene-controls__divider" />
      <div className="scene-controls__date-wrapper" ref={dateRef}>
        <button
          type="button"
          className={snapshotDate ? 'is-active' : ''}
          onClick={() => setDateOpen(!dateOpen)}
          aria-expanded={dateOpen}
          aria-label={fr ? 'Positions à une date' : 'Positions at a date'}
        >
          <Icon name="calendar" size={16} />
          <span>{snapshotDate ? toInputDate(snapshotDate) : (fr ? 'Date' : 'Date')}</span>
        </button>
        {dateOpen && (
          <div className="date-picker glass-panel">
            <p className="date-picker__label">{fr ? 'Positions des planètes au :' : 'Planet positions on:'}</p>
            <input
              type="date"
              value={snapshotDate ? toInputDate(snapshotDate) : ''}
              min="1900-01-01"
              max="2100-12-31"
              onChange={(e) => handleDateChange(e.target.value)}
            />
            <div className="date-picker__actions">
              <button type="button" onClick={setToday}>{fr ? 'Aujourd\'hui' : 'Today'}</button>
              {snapshotDate && (
                <button type="button" onClick={() => { onSnapshotDate(null); setDateOpen(false); }}>
                  {fr ? 'Mode libre' : 'Live mode'}
                </button>
              )}
            </div>
            {snapshotDate && (
              <p className="date-picker__hint">
                <Icon name="info" size={13} /> {fr ? 'Positions figées (approximation képlérienne)' : 'Frozen positions (Keplerian approximation)'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
