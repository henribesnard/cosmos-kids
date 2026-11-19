import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantMessage } from '../../assistant/types';
import { useCosmosStore } from '../../store';
import { DiscoveryLog } from '../DiscoveryLog';
import { NovaDock } from './NovaDock';
import { NovaMessage } from './NovaMessage';
import NovaPanel from './NovaPanel';
import { TruthSeal } from './TruthSeal';
import { NOVA_MET_STORAGE_KEY } from './novaHooks';

const ANSWER_TIMEOUT = { timeout: 6000 };
vi.setConfig({ testTimeout: 12_000 });

function renderPanel(overrides: Partial<React.ComponentProps<typeof NovaPanel>> = {}) {
  const props = {
    locale: useCosmosStore.getState().locale,
    open: true,
    reducedMotion: true,
    onClose: vi.fn(),
    canTravel: (id: string) => id === 'saturn',
    onTravel: vi.fn(),
    onOpenParents: vi.fn(),
    ...overrides,
  };
  const utils = render(<MemoryRouter><NovaPanel {...props} /></MemoryRouter>);
  return { ...utils, props };
}

function renderNovaMessage(
  status: AssistantMessage['status'],
  special: 'off-topic' | 'privacy' | 'safety' | 'error' | null = null,
) {
  const message: AssistantMessage = {
    id: 'nova-message',
    role: 'nova',
    text: 'Réponse de Nova',
    createdAt: Date.now(),
    ...(status ? { status } : {}),
    ...(special ? { kind: special } : {}),
  };
  render(
    <NovaMessage
      message={message}
      question="Qu’y a-t-il dans un trou noir ?"
      locale="fr"
      special={special}
      arrivalPhase={undefined}
      guess={{ revealed: true, guess: null }}
      isLast
      now={Date.now()}
      speech={{ supported: false, speakingId: null, toggle: () => undefined, stop: () => undefined }}
      canTravel={() => true}
      onTravel={() => undefined}
      onReveal={() => undefined}
      onRetry={null}
    />,
  );
}

async function ask(question: string) {
  const input = screen.getByRole('textbox', { name: /Ta question pour Nova|Your question for Nova/ });
  fireEvent.change(input, { target: { value: question } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

describe('Nova', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/?nova=mock');
    useCosmosStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  describe('dock', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <MemoryRouter>
          <NovaDock
            locale={useCosmosStore((state) => state.locale)}
            open={open}
            onOpenChange={setOpen}
            reducedMotion
            canGreet
            canTravel={() => true}
            onTravel={() => undefined}
            onOpenParents={() => undefined}
          />
        </MemoryRouter>
      );
    }

    it('ouvre et ferme Nova, puis rend le focus au bouton', async () => {
      render(<Harness />);
      const dock = screen.getByRole('button', { name: /Poser une question à Nova/ });
      fireEvent.click(dock);
      const panel = await screen.findByRole('complementary', { name: 'Nova' });
      expect(panel).toBeVisible();
      fireEvent.click(within(panel).getByRole('button', { name: 'Fermer Nova' }));
      await waitFor(() => expect(screen.getByRole('button', { name: /Poser une question à Nova/ })).toHaveFocus());
      expect(panel).not.toBeVisible();
    });

    it('se présente au premier lancement sans bloquer, et s’ouvre avec la touche N', async () => {
      render(<Harness />);
      expect(screen.getByText(/je ne te dis que ce que j’ai vérifié/i)).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'n' });
      expect(await screen.findByRole('complementary', { name: 'Nova' })).toBeVisible();
      expect(window.localStorage.getItem(NOVA_MET_STORAGE_KEY)).toBe('1');
      expect(document.querySelector('.nova-greeting')).toBeNull();
    });

    it('ignore la touche N pendant la saisie et avec Ctrl', () => {
      render(<Harness />);
      fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    });

    it('bascule en anglais', () => {
      act(() => useCosmosStore.getState().setLocale('en'));
      render(<Harness />);
      expect(screen.getByRole('button', { name: /Ask Nova a question/ })).toBeInTheDocument();
      expect(screen.getByText('Hi, I’m Nova!')).toBeInTheDocument();
    });
  });

  describe('scroll de la conversation', () => {
    it('réserve un dégagement sous les actions de fin de réponse', () => {
      const { container } = renderPanel();
      const scroll = container.querySelector('.nova-panel__scroll');
      expect(scroll).toHaveStyle({ paddingBottom: '144px', scrollPaddingBottom: '144px' });
    });
  });

  describe('sceau de vérité', () => {
    it('rend trois badges distincts par texte et par forme', () => {
      const { container } = render(
        <>
          <TruthSeal status="verified" claims={[]} sources={[]} locale="fr" />
          <TruthSeal status="debated" claims={[]} sources={[]} locale="fr" />
          <TruthSeal status="unknown" claims={[]} sources={[]} locale="fr" />
        </>,
      );
      expect(screen.getByText('Vérifié')).toBeInTheDocument();
      expect(screen.getByText('Débattu')).toBeInTheDocument();
      expect(screen.getByText('Mystère')).toBeInTheDocument();
      expect(container.querySelector('.nova-seal--verified')).not.toBeNull();
      expect(container.querySelector('.nova-seal--debated')).not.toBeNull();
      expect(container.querySelector('.nova-seal--unknown')).not.toBeNull();
      expect(screen.getByText(/la science avance comme ça/)).toBeInTheDocument();
    });

    it('déplie les sources, avec le carnet de bord et sa source d’origine', () => {
      render(
        <TruthSeal
          status="verified"
          locale="fr"
          claims={[{ text: 'Saturne a au moins 146 lunes.', status: 'verified', sourceIds: ['a', 'b'] }]}
          sources={[
            { id: 'a', title: 'Saturn Fact Sheet', publisher: 'NASA NSSDC', url: 'https://nssdc.gsfc.nasa.gov/', kind: 'catalog' },
            { id: 'b', title: 'Discovery Circumstances', publisher: 'NASA JPL', url: 'https://ssd.jpl.nasa.gov/', kind: 'web' },
            { id: 'c', title: 'Bad', publisher: 'X', url: 'javascript:alert(1)', kind: 'web' },
          ]}
        />,
      );
      const toggle = screen.getByRole('button', { name: /Vérifié/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Carnet de bord COSMOS KIDS')).not.toBeVisible();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Carnet de bord COSMOS KIDS')).toBeVisible();
      expect(screen.getByText('d’après NASA NSSDC')).toBeVisible();
      expect(screen.getByText('NASA JPL')).toBeVisible();
      expect(screen.getByText('[1] [2]')).toBeInTheDocument();
      const links = screen.getAllByRole('link', { name: /Ouvrir la source/ });
      expect(links).toHaveLength(2);
      expect(links[1]).toHaveAttribute('href', 'https://ssd.jpl.nasa.gov/');
      expect(links[1]).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('garder une question comme mystère', () => {
    it.each(['unknown', 'debated'] as const)('le permet pour le statut %s', (status) => {
      renderNovaMessage(status);
      const keepButton = screen.getByRole('button', { name: /Garder ce mystère/ });
      fireEvent.click(keepButton);
      expect(useCosmosStore.getState().mysteries).toHaveLength(1);
      expect(useCosmosStore.getState().mysteries[0]?.question).toBe('Qu’y a-t-il dans un trou noir ?');
    });

    it('ne le propose pas pour une réponse vérifiée', () => {
      renderNovaMessage('verified');
      expect(screen.queryByRole('button', { name: /Garder ce mystère/ })).not.toBeInTheDocument();
    });

    it.each(['off-topic', 'privacy', 'safety', 'error'] as const)('ne le propose pas pour un refus %s', (special) => {
      renderNovaMessage(undefined, special);
      expect(screen.queryByRole('button', { name: /Garder ce mystère/ })).not.toBeInTheDocument();
    });
  });

  describe('conversation (mode simulé)', () => {
    it('montre le voyage de vérification puis une réponse vérifiée avec action de voyage', async () => {
      const { props } = renderPanel();
      await ask('Combien de lunes a Saturne ?');
      expect(await screen.findByText(/Je lis bien ta question|Je regarde dans mon carnet de bord/)).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /^Vérifié/ }, ANSWER_TIMEOUT)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Emmène-moi voir/ }));
      expect(props.onTravel).toHaveBeenCalledWith('saturn');
      expect(screen.getByRole('group', { name: 'Pour aller plus loin' })).toBeInTheDocument();
      expect(screen.getByText(/Encore 19 questions en réserve/)).toBeInTheDocument();
    });

    it('demande de deviner d’abord, puis révèle la réponse débattue', async () => {
      renderPanel();
      await ask("Qu'y a-t-il dans un trou noir ?");
      expect(await screen.findByText('Devine d’abord !', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.queryByText('Débattu')).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText('Ton hypothèse'), { target: { value: 'Un tourbillon' } });
      fireEvent.click(screen.getByRole('button', { name: 'Voir la réponse' }));
      expect(screen.getByText(/Ton hypothèse.*Un tourbillon/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Débattu/ })).toHaveAttribute('aria-expanded', 'false');
    });

    it('garde un mystère dans le carnet', async () => {
      renderPanel();
      await ask('Existe-t-il une vie extraterrestre ?');
      fireEvent.click(await screen.findByRole('button', { name: /pas d’idée/ }, ANSWER_TIMEOUT));
      expect(screen.getByText('Mystère')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Garder ce mystère/ }));
      expect(useCosmosStore.getState().mysteries).toHaveLength(1);
      expect(useCosmosStore.getState().mysteries[0]?.question).toBe('Existe-t-il une vie extraterrestre ?');
      expect(screen.getByRole('button', { name: /Rangé dans ton Carnet/ })).toBeDisabled();
    });

    it('rebondit avec chaleur sur une question hors sujet', async () => {
      renderPanel();
      await ask('Tu connais une recette de crêpes ?');
      expect(await screen.findByText('Hors de ma galaxie', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /Une idée de question spatiale/ })).toBeInTheDocument();
      expect(screen.queryByText('Vérifié')).not.toBeInTheDocument();
    });

    it('oriente vers un adulte de confiance, sans suggestions ludiques', async () => {
      renderPanel();
      await ask("J'ai peur du noir");
      expect(await screen.findByText('Parle à un adulte de confiance', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByText(/adulte que tu connais bien peut t’écouter/)).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: /Pour aller plus loin|Idées de questions/ })).not.toBeInTheDocument();
    });

    it('affiche la recharge des panneaux solaires et bloque l’envoi', async () => {
      renderPanel();
      await ask('trop de questions');
      expect(await screen.findByText('Nova recharge ses panneaux solaires', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    });

    it('propose de réessayer après une erreur', async () => {
      renderPanel();
      await ask('erreur');
      expect(await screen.findByRole('button', { name: /Réessayer/ }, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByText('Petit souci de transmission')).toBeInTheDocument();
    });

    it('parle anglais quand la langue change', async () => {
      act(() => useCosmosStore.getState().setLocale('en'));
      renderPanel({ locale: 'en' });
      expect(screen.getByRole('radio', { name: 'Curious' })).toHaveAttribute('aria-checked', 'true');
      await ask('How many moons does Saturn have?');
      expect(await screen.findByRole('button', { name: /^Verified/ }, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Take me there/ })).toBeInTheDocument();
    });
  });

  describe('carnet', () => {
    it('liste les mystères gardés et permet de les retirer', () => {
      useCosmosStore.getState().addMystery('Qu’y a-t-il avant le Big Bang ?', 'fr');
      render(
        <DiscoveryLog locale="fr" missionState={useCosmosStore.getState().mission} onClose={() => undefined} onSelectJourney={() => undefined} />,
      );
      fireEvent.click(screen.getByRole('tab', { name: /Mystères de l’Univers/ }));
      expect(screen.getByText('Qu’y a-t-il avant le Big Bang ?')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Retirer le mystère/ }));
      expect(useCosmosStore.getState().mysteries).toHaveLength(0);
      expect(screen.getByText(/Aucun mystère pour l’instant/)).toBeInTheDocument();
    });
  });
});
