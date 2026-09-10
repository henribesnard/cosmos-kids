import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_COSMIC_IDS, DEEP_SKY_BY_ID, isCelestialObjectId, SOLAR_SYSTEM_BODY_BY_ID } from '../data';
import { useCosmosStore } from '../store';
import { App } from './App';
import { travelDestinationName } from './travelDestinations';

vi.mock('../scene/UniverseViewport', () => ({
  UniverseViewport: ({ view, onSelect }: { view: string; onSelect: (id: string) => void }) => (
    <div data-testid="universe-viewport">
      {view}
      <button type="button" onClick={() => onSelect('mars')}>Objet 3D Mars</button>
    </div>
  ),
}));

function renderAt(pathname: string) {
  return render(<MemoryRouter initialEntries={[pathname]}><LocationProbe /><App /></MemoryRouter>);
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-path" hidden>{location.pathname}</output>;
}

describe('parcours V1', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCosmosStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('part de la landing puis ouvre la scène Terre', async () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: /L’Univers est immense/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Commencer depuis la Terre/i }));
    await waitFor(() => expect(screen.getByText('Notre monde bleu et vivant')).toBeInTheDocument());
    expect(useCosmosStore.getState().view).toBe('earth');
    expect(useCosmosStore.getState().mission.visitedObjectIds).toContain('earth');
  });

  it('ouvre la recherche avec le raccourci clavier', async () => {
    renderAt('/explore/solar-system');
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByRole('dialog', { name: /Destinations/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Une planète/i)).toBeInTheDocument();
  });

  it('expose aussi la Lune dans les destinations de la vue globale', async () => {
    renderAt('/explore/solar-system');
    const catalogue = await screen.findByRole('region', { name: /Liste accessible des mondes visibles/i });
    expect(within(catalogue).getByRole('button', { name: /Lune — Satellite naturel/i })).toBeInTheDocument();
  });

  it('rend la destination ISS au clavier depuis la liste accessible', async () => {
    useCosmosStore.getState().setReducedMotion(true);
    renderAt('/explore/earth');

    const catalogue = await screen.findByRole('region', { name: /Liste accessible des mondes visibles/i });
    fireEvent.click(within(catalogue).getByRole('button', { name: /Station spatiale internationale — Station orbitale/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Station spatiale internationale' })).toBeInTheDocument());
    expect(useCosmosStore.getState().mission.visitedSpecialIds).toContain('iss');
  });

  it('ouvre la vue détaillée avec un clic simple sur un astre 3D', async () => {
    useCosmosStore.getState().setReducedMotion(true);
    renderAt('/explore/solar-system');
    fireEvent.click(await screen.findByText('Objet 3D Mars'));
    await waitFor(() => expect(useCosmosStore.getState().view).toBe('planet'));
    expect(useCosmosStore.getState().selectedObjectId).toBe('mars');
    expect(screen.getByTestId('universe-viewport')).toHaveTextContent('planet');
  });

  it('accepte une route directe vers Saturne', async () => {
    renderAt('/explore/solar-system/saturn');
    expect(await screen.findByText('La planète aux milliers d’anneaux')).toBeInTheDocument();
    expect(screen.getByTestId('universe-viewport')).toHaveTextContent('planet');
    expect(useCosmosStore.getState().selectedObjectId).toBe('saturn');
  });

  it.each([
    { destinationId: 'earth', destinationName: 'Terre', expectedView: 'earth', expectedSelection: 'earth' },
    { destinationId: 'solar', destinationName: 'Syst\u00E8me solaire', expectedView: 'solar', expectedSelection: null },
    { destinationId: 'milkyway', destinationName: 'Voie lact\u00E9e', expectedView: 'milkyway', expectedSelection: null },
    { destinationId: 'localgroup', destinationName: 'Groupe local de galaxies', expectedView: 'localgroup', expectedSelection: null },
  ] as const)(
    'affiche un voyage propre vers $destinationName',
    async ({ destinationId, destinationName, expectedView, expectedSelection }) => {
      vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
      renderAt('/explore/earth');

      const scaleNavigator = await screen.findByRole('navigation', { name: /Univers/i });
      fireEvent.click(within(scaleNavigator).getByRole('button', { name: destinationName }));

      const travelStatus = await screen.findByRole('status');
      expect(travelStatus).toHaveAttribute('data-destination', destinationId);
      expect(within(travelStatus).getByRole('heading', { name: destinationName })).toBeInTheDocument();

      fireEvent.click(within(travelStatus).getByRole('button', { name: /Passer le voyage/i }));
      await waitFor(() => expect(useCosmosStore.getState().view).toBe(expectedView));
      expect(useCosmosStore.getState().selectedObjectId).toBe(expectedSelection);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    },
  );

  it('distingue les vues d\u2019ensemble de leurs objets repr\u00E9sentatifs', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    renderAt('/explore/earth');

    const scaleNavigator = await screen.findByRole('navigation', { name: /Univers/i });
    fireEvent.click(within(scaleNavigator).getByRole('button', { name: 'Syst\u00E8me solaire' }));
    let travelStatus = await screen.findByRole('status');
    expect(travelStatus).toHaveAttribute('data-destination', 'solar');
    expect(within(travelStatus).queryByRole('heading', { name: 'Soleil' })).not.toBeInTheDocument();
    fireEvent.click(within(travelStatus).getByRole('button', { name: /Passer le voyage/i }));

    fireEvent.click(within(scaleNavigator).getByRole('button', { name: 'Groupe local de galaxies' }));
    travelStatus = await screen.findByRole('status');
    expect(travelStatus).toHaveAttribute('data-destination', 'localgroup');
    expect(within(travelStatus).queryByRole('heading', { name: /Androm/i })).not.toBeInTheDocument();
  });

  it('ouvre directement le ciel nocturne sans faux \u00E9cran de voyage', async () => {
    renderAt('/explore/earth');
    const scaleNavigator = await screen.findByRole('navigation', { name: /Univers/i });
    fireEvent.click(within(scaleNavigator).getByRole('button', { name: 'Ciel nocturne' }));

    await waitFor(() => expect(useCosmosStore.getState().view).toBe('constellations'));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rend toutes les constellations visibles accessibles au clavier', async () => {
    renderAt('/explore/constellations');

    const catalogue = await screen.findByRole('region', { name: /Liste accessible des mondes visibles/i });
    fireEvent.click(within(catalogue).getByRole('button', { name: /Orion — Constellation/i }));

    await waitFor(() => expect(useCosmosStore.getState().selectedConstellationId).toBe('Ori'));
    expect(screen.getByRole('heading', { name: 'Orion' })).toBeInTheDocument();
  });

  it('rend le marqueur du Soleil de la Voie lactée accessible au clavier', async () => {
    useCosmosStore.getState().setReducedMotion(true);
    renderAt('/explore/milky-way');

    const catalogue = await screen.findByRole('region', { name: /Liste accessible des mondes visibles/i });
    fireEvent.click(within(catalogue).getByRole('button', { name: /Soleil — Étoile/i }));

    await waitFor(() => expect(useCosmosStore.getState().view).toBe('solar'));
  });

  it('restaure une URL de comparaison et valide sa fermeture avec Échap', async () => {
    useCosmosStore.getState().startJourney('earth-to-moon');
    renderAt('/compare/earth/moon');

    const dialog = await screen.findByRole('dialog', { name: /Comparer deux mondes/i });
    expect(within(dialog).getByText('Terre')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: 'Second monde' })).toHaveValue('moon');
    expect(useCosmosStore.getState().view).toBe('earth');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Comparer deux mondes/i })).not.toBeInTheDocument());
    expect(useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds)
      .toContain('moon-compare');
  });

  it('conserve le second objet choisi dans l’URL de comparaison', async () => {
    renderAt('/compare/earth/moon');

    const dialog = await screen.findByRole('dialog', { name: /Comparer deux mondes/i });
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Second monde' }), {
      target: { value: 'mars' },
    });

    await waitFor(() => expect(screen.getByTestId('location-path')).toHaveTextContent('/compare/earth/mars'));
    expect(within(screen.getByRole('dialog', { name: /Comparer deux mondes/i }))
      .getByRole('combobox', { name: 'Second monde' })).toHaveValue('mars');
  });

  it.each(ALL_COSMIC_IDS)('r\u00E9sout le bon titre de voyage pour %s', (destinationId) => {
    const object = isCelestialObjectId(destinationId)
      ? SOLAR_SYSTEM_BODY_BY_ID[destinationId]
      : DEEP_SKY_BY_ID[destinationId];

    expect(travelDestinationName(destinationId, 'fr')).toBe(object.name.fr);
    expect(travelDestinationName(destinationId, 'en')).toBe(object.name.en);
  });

  it('affiche les sources depuis une route partageable', async () => {
    renderAt('/credits');
    expect(await screen.findByRole('heading', { name: 'Sources & crédits' })).toBeInTheDocument();
    expect(screen.getByText(/Creative Commons Attribution 4.0/i)).toBeInTheDocument();
  });

  it('ouvre un trajet, le démarre puis valide la visite de la Lune', async () => {
    useCosmosStore.getState().setReducedMotion(true);
    renderAt('/trajets/earth-to-moon');

    expect(await screen.findByRole('heading', { name: 'Terre → Lune' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer ce trajet' }));
    await waitFor(() => expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).toContain('moon-visit-earth'));

    fireEvent.click(screen.getByRole('button', { name: 'Y aller' }));
    await waitFor(() => expect(
      useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds,
    ).toContain('moon-visit-moon'));
  });

  it('ne transforme pas en progrès un voyage fait avant le démarrage', async () => {
    useCosmosStore.getState().setReducedMotion(true);
    renderAt('/explore/solar-system/moon');
    await waitFor(() => expect(useCosmosStore.getState().mission.visitedObjectIds).toContain('moon'));

    const mainNavigation = screen.getByRole('navigation', { name: 'Explorer' });
    fireEvent.click(within(mainNavigation).getByRole('button', { name: 'Trajets' }));
    fireEvent.click(await screen.findByRole('button', { name: /Terre → Lune/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Démarrer ce trajet' }));

    expect(useCosmosStore.getState().mission.runs['earth-to-moon']?.completedStepIds)
      .not.toContain('moon-visit-moon');
  });

  it('présente le trou noir comme une simulation et jamais comme un voyage réel', async () => {
    renderAt('/trajets/into-a-black-hole');

    expect(await screen.findByText(/Personne ne peut le faire, et personne ne pourrait revenir/)).toBeInTheDocument();
    expect(screen.getByText(/Simulation — visualisation éducative/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Démarrer l’exploration simulée/i }));
    expect(screen.queryByRole('button', { name: 'Y aller' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Voir la simulation/i }).length).toBeGreaterThan(0);
  });

  it('restaure le carnet depuis son URL et affiche la date de première visite', async () => {
    useCosmosStore.getState().recordDiscovery('mars', new Date('2026-09-06T10:00:00Z').getTime());
    renderAt('/carnet');

    expect(await screen.findByRole('heading', { name: 'Carnet de découverte' })).toBeInTheDocument();
    expect(screen.getByText('Mars')).toBeInTheDocument();
    expect(screen.getByText('Planète')).toBeInTheDocument();
  });
});
