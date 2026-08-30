import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  return render(<MemoryRouter initialEntries={[pathname]}><App /></MemoryRouter>);
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
});
