import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCosmosStore } from '../store';
import { App } from './App';

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

  afterEach(() => cleanup());

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

  it('affiche les sources depuis une route partageable', async () => {
    renderAt('/credits');
    expect(await screen.findByRole('heading', { name: 'Sources & crédits' })).toBeInTheDocument();
    expect(screen.getByText(/Creative Commons Attribution 4.0/i)).toBeInTheDocument();
  });
});
