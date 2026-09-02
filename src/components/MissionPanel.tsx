import type { Locale } from '../app/uiTypes';
import type { MissionDef, MissionId } from '../data/missions';
import type { MissionState } from '../store/useCosmosStore';
import { Icon } from './Icon';
import { MissionListView } from './MissionListView';
import { MissionDetailView } from './MissionDetailView';

interface MissionPanelProps {
  locale: Locale;
  missions: readonly MissionDef[];
  missionState: MissionState;
  activeMissionId: MissionId | null;
  open: boolean;
  onClose: () => void;
  onSelectMission: (id: MissionId | null) => void;
  onTravel: (id: string) => void;
}

export function MissionPanel({
  locale,
  missions,
  missionState,
  activeMissionId,
  open,
  onClose,
  onSelectMission,
  onTravel,
}: MissionPanelProps) {
  const fr = locale === 'fr';
  const activeMission = activeMissionId
    ? missions.find((m) => m.id === activeMissionId) ?? null
    : null;

  return (
    <aside
      className={`mission-panel glass-panel ${open ? 'is-open' : ''}`}
      data-scene-obstacle
      aria-label={fr ? 'Missions' : 'Missions'}
    >
      <div className="mission-panel__header">
        <h2 className="mission-panel__title">{fr ? 'Missions' : 'Missions'}</h2>
        <button
          className="icon-button mission-panel__close"
          type="button"
          onClick={onClose}
          aria-label={fr ? 'Fermer' : 'Close'}
        >
          <Icon name="close" />
        </button>
      </div>

      {activeMission ? (
        <MissionDetailView
          locale={locale}
          mission={activeMission}
          missionState={missionState}
          onBack={() => onSelectMission(null)}
          onTravel={onTravel}
        />
      ) : (
        <MissionListView
          locale={locale}
          missions={missions}
          missionState={missionState}
          onSelect={(id) => onSelectMission(id as MissionId)}
        />
      )}
    </aside>
  );
}
