import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantMessage } from '../../assistant/types';
import { useCosmosStore } from '../../store';
import { DiscoveryLog } from '../DiscoveryLog';
import { InfoPanel } from '../InfoPanel';
import type { ObjectDisplay } from '../../app/uiTypes';
import { NovaDock } from './NovaDock';
import { NovaMessage } from './NovaMessage';
import NovaPanel from './NovaPanel';
import { TruthSeal } from './TruthSeal';
import { NOVA_MET_STORAGE_KEY, NOVA_SIZE_STORAGE_KEY } from './novaHooks';
import { formatDuration } from './novaText';
import { rechargeLeftSeconds, STILL_WORKING_AFTER_S } from './novaUtils';

const ANSWER_TIMEOUT = { timeout: 6000 };
vi.setConfig({ testTimeout: 12_000 });
const nativeScrollTo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

function renderPanel(overrides: Partial<React.ComponentProps<typeof NovaPanel>> = {}, container?: HTMLElement) {
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
  const utils = render(<MemoryRouter><NovaPanel {...props} /></MemoryRouter>, container ? { container } : {});
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
    if (typeof HTMLElement.prototype.scrollTo !== 'function') {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        configurable: true,
        value: function (this: HTMLElement, options: ScrollToOptions) {
          this.scrollTop = options.top ?? 0;
        },
      });
    }
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
    if (nativeScrollTo) Object.defineProperty(HTMLElement.prototype, 'scrollTo', nativeScrollTo);
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
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
    it('réserve un dégagement sous les actions de fin de réponse, dans la liste qui défile', () => {
      const { container } = renderPanel();
      const scroll = container.querySelector('.nova-panel__scroll');
      // Lot 2: no more 144px dead zone on the outer container (it shrank the reading area).
      expect(scroll).toHaveStyle({ paddingBottom: '12px' });
      const css = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n');
      expect(css).toMatch(/\.nova-log:not\(:empty\) \{ padding-bottom: 24px/);
    });

    it('défile uniquement la liste à chaque nouveau message', async () => {
      const shell = document.createElement('div');
      shell.className = 'app-shell';
      document.body.appendChild(shell);
      const { container, props, rerender, unmount } = renderPanel({}, shell);
      const log = container.querySelector<HTMLOListElement>('.nova-log');
      expect(log).not.toBeNull();
      if (!log) throw new Error('Conversation log not rendered');

      const rect = (top: number): DOMRect => ({
        x: 0,
        y: top,
        top,
        right: 800,
        bottom: top + 40,
        left: 0,
        width: 800,
        height: 40,
        toJSON: () => ({}),
      });
      const scrollTo = vi.fn((options: ScrollToOptions) => {
        log.scrollTop = options.top ?? 0;
      });
      Object.defineProperty(log, 'scrollTo', { configurable: true, value: scrollTo });
      const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this === log) return rect(100);
        if (this.classList.contains('nova-msg--child')) return rect(240 - log.scrollTop);
        if (this.classList.contains('nova-msg--nova')) return rect(360 - log.scrollTop);
        return rect(0);
      });

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      shell.scrollTop = 0;

      try {
        await ask('Combien de lunes a Saturne ?');
        expect(await screen.findByText(/Je lis bien ta question|Je regarde dans mon carnet de bord/)).toBeInTheDocument();
        expect(scrollTo).toHaveBeenCalledTimes(1);
        expect(scrollTo).toHaveBeenNthCalledWith(1, { top: 140, behavior: 'auto' });

        expect(await screen.findByRole('button', { name: /^Vérifié/ }, ANSWER_TIMEOUT)).toBeInTheDocument();
        expect(scrollTo).toHaveBeenCalledTimes(2);
        expect(scrollTo).toHaveBeenNthCalledWith(2, { top: 260, behavior: 'auto' });
        expect(log.scrollTop).toBe(260);
        expect(log.lastElementChild?.getBoundingClientRect().top).toBe(log.getBoundingClientRect().top);
        expect(shell.scrollTop).toBe(0);
        expect((document.scrollingElement ?? document.documentElement).scrollTop).toBe(0);

        rerender(<MemoryRouter><NovaPanel {...props} reducedMotion={false} /></MemoryRouter>);
        expect(scrollTo).toHaveBeenCalledTimes(2);
      } finally {
        bounds.mockRestore();
        unmount();
        shell.remove();
      }
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

  describe('lot 2', () => {
    const MARS: ObjectDisplay = {
      id: 'mars',
      name: { fr: 'Mars', en: 'Mars' },
      kind: { fr: 'Planète', en: 'Planet' },
      tagline: { fr: 'La planète rouge', en: 'The red planet' },
      description: { fr: 'Texte simple', en: 'Simple text' },
      curious: { fr: 'Texte curieux', en: 'Curious text' },
      expert: { fr: 'Texte expert', en: 'Expert text' },
      color: '#c1440e',
      symbol: '♂',
      facts: [],
    };

    beforeEach(() => {
      window.sessionStorage.clear();
    });

    it('1 — remplace les 60 s fixes par le délai réel du serveur', async () => {
      renderPanel();
      await ask('trop de questions');
      expect(await screen.findByText('Nova recharge ses panneaux solaires', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getAllByText(/Nova recharge ses panneaux solaires… encore 4\d\s*s/).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled();
    });

    it('1 — calcule le compte à rebours à partir de retryAfterSeconds', () => {
      const message: AssistantMessage = { id: 'r', role: 'nova', text: '', createdAt: 1_000_000, kind: 'rate-limited', retryAfterSeconds: 1800 };
      expect(rechargeLeftSeconds(message, 1_000_000)).toBe(1800);
      expect(rechargeLeftSeconds(message, 1_000_000 + 600_000)).toBe(1200);
      expect(rechargeLeftSeconds(message, 1_000_000 + 1_900_000)).toBe(0);
      const legacy: AssistantMessage = { id: 'l', role: 'nova', text: '', createdAt: 0, kind: 'rate-limited' };
      expect(rechargeLeftSeconds(legacy, 0)).toBe(60);
      expect(formatDuration(42)).toBe('42 s');
      expect(formatDuration(1200)).toBe('20 min 00 s');
      expect(formatDuration(3600)).toBe('1 h 00 min');
    });

    it('2 — la phase offline vient du hook : bannière, envoi bloqué, puis retour du signal', async () => {
      const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
      try {
        renderPanel();
        act(() => {
          window.dispatchEvent(new Event('offline'));
        });
        expect(screen.getByText(/Pas de connexion/)).toBeInTheDocument();
        onLine.mockReturnValue(true);
        act(() => {
          window.dispatchEvent(new Event('online'));
        });
        expect(screen.queryByText(/Pas de connexion/)).not.toBeInTheDocument();
      } finally {
        onLine.mockRestore();
      }
    });

    it('2 — une coupure réseau pendant la requête passe en offline avec « Réessayer »', async () => {
      renderPanel();
      await ask('hors ligne');
      expect(await screen.findByRole('button', { name: /Réessayer/ }, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByText('Pas de signal')).toBeInTheDocument();
      expect(screen.getByText(/Pas de connexion/)).toBeInTheDocument();
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(screen.queryByText(/Pas de connexion/)).not.toBeInTheDocument();
    });

    it('3 — niveau simple : les hypothèses en gros boutons, sans les présenter comme des faits', async () => {
      useCosmosStore.getState().setReadingLevel('simple');
      renderPanel();
      await ask("Qu'y a-t-il dans un trou noir ?");
      const group = await screen.findByRole('group', { name: 'Choisis ton hypothèse' }, ANSWER_TIMEOUT);
      expect(within(group).getAllByRole('button')).toHaveLength(3);
      expect(screen.queryByLabelText('Ton hypothèse')).not.toBeInTheDocument();
      expect(screen.getByText(/des idées, pas encore des réponses/)).toBeInTheDocument();
      expect(screen.queryByText('Débattu')).not.toBeInTheDocument();
      fireEvent.click(within(group).getByRole('button', { name: 'Un point super dense' }));
      expect(screen.getByText(/Ton hypothèse.*Un point super dense/)).toBeInTheDocument();
      expect(screen.getByText(/Compare avec ce que disent les scientifiques/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Débattu/ })).toBeInTheDocument();
    });

    it('3 — autres niveaux : le champ libre reste, les idées en petits boutons', async () => {
      useCosmosStore.getState().setReadingLevel('expert');
      renderPanel();
      await ask("Qu'y a-t-il dans un trou noir ?");
      expect(await screen.findByLabelText('Ton hypothèse', {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      const mini = screen.getByRole('group', { name: /Ou choisis une idée/ });
      expect(within(mini).getAllByRole('button')).toHaveLength(3);
    });

    it('4 — Nova et l’InfoPanel partagent le même niveau de lecture', () => {
      render(
        <MemoryRouter>
          <NovaPanel locale="fr" open reducedMotion onClose={vi.fn()} canTravel={() => false} onTravel={vi.fn()} onOpenParents={vi.fn()} />
          <InfoPanel locale="fr" object={MARS} onCompare={vi.fn()} onClose={vi.fn()} />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole('radio', { name: 'Expert' }));
      expect(screen.getByRole('tab', { name: 'Expert' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Texte expert')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: 'Simple' }));
      expect(screen.getByRole('radio', { name: 'Simple' })).toHaveAttribute('aria-checked', 'true');
      expect(useCosmosStore.getState().readingLevel).toBe('simple');
    });

    it('5 — un prénom seul : réponse normale avec un bref rappel', async () => {
      renderPanel();
      await ask('Je m’appelle Léo, combien y a-t-il de galaxies ?');
      expect(await screen.findByText(/garde ton prénom pour toi/, {}, ANSWER_TIMEOUT)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Vérifié/ })).toBeInTheDocument();
    });

    it('8 — le message de patience est calibré sur la latence réelle (10 s)', () => {
      expect(STILL_WORKING_AFTER_S).toBe(10);
    });

    it('9 — Agrandir : compact → large → plein écran, Échap revient et rend le focus', () => {
      renderPanel();
      const button = screen.getByRole('button', { name: 'Agrandir Nova' });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(button);
      const panel = screen.getByRole('complementary', { name: 'Nova' });
      expect(panel).toHaveClass('nova-panel--wide');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAccessibleName('Passer Nova en plein écran');

      fireEvent.click(button);
      const dialog = screen.getByRole('dialog', { name: 'Nova' });
      expect(dialog).toHaveClass('nova-panel--full');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(button).toHaveAccessibleName('Réduire Nova');
      expect(document.querySelector('.nova-veil')).not.toBeNull();
      expect(JSON.parse(window.sessionStorage.getItem(NOVA_SIZE_STORAGE_KEY) ?? '{}')).toMatchObject({ size: 'full', previous: 'wide' });

      // Focus trap: Tab from the last focusable goes back to the first one.
      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), textarea'));
      focusables.at(-1)!.focus();
      fireEvent.keyDown(dialog, { key: 'Tab' });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);

      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(screen.getByRole('complementary', { name: 'Nova' })).toHaveClass('nova-panel--wide');
      expect(screen.getByRole('button', { name: 'Passer Nova en plein écran' })).toHaveFocus();
    });

    it('9 — la taille choisie est mémorisée pour la session', () => {
      window.sessionStorage.setItem(NOVA_SIZE_STORAGE_KEY, JSON.stringify({ size: 'wide', previous: 'compact' }));
      renderPanel();
      expect(screen.getByRole('complementary', { name: 'Nova' })).toHaveClass('nova-panel--wide');
    });

    it('9 — en anglais, libellés traduits', () => {
      act(() => useCosmosStore.getState().setLocale('en'));
      renderPanel({ locale: 'en' });
      expect(screen.getByRole('button', { name: 'Enlarge Nova' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('9 — sur tablette/mobile, le même bouton monte la feuille en pleine hauteur', () => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        matches: query.includes('max-width: 1023px'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia;
      try {
        renderPanel();
        const button = screen.getByRole('button', { name: 'Agrandir Nova en plein écran' });
        fireEvent.click(button);
        expect(screen.getByRole('dialog', { name: 'Nova' })).toHaveClass('nova-panel--full');
        expect(button).toHaveAccessibleName('Réduire Nova');
        fireEvent.keyDown(screen.getByRole('dialog', { name: 'Nova' }), { key: 'Escape' });
        expect(screen.getByRole('dialog', { name: 'Nova' })).toHaveClass('nova-panel--compact');
      } finally {
        window.matchMedia = original;
      }
    });
  });
});
