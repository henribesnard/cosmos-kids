import { describe, expect, it } from 'vitest';
import { toPlainText } from './plainText';

describe('toPlainText — no Markdown reaches the child', () => {
  it.each([
    ['*Pouf !* Une étoile filante.', 'Pouf ! Une étoile filante.'],
    ['Saturne est **énorme** !', 'Saturne est énorme !'],
    ['C’est __vraiment__ loin.', 'C’est vraiment loin.'],
    ['Une _très_ grande planète.', 'Une très grande planète.'],
    ['## Le Soleil\nIl brille.', 'Le Soleil\nIl brille.'],
    ['- Mercure\n- Vénus', '• Mercure\n• Vénus'],
    ['* Mercure\n* Vénus', '• Mercure\n• Vénus'],
    ['Voir [la NASA](https://nasa.gov).', 'Voir la NASA.'],
    ['Code `Mars`', 'Code Mars'],
    ['Une étoile *unbalanced', 'Une étoile unbalanced'],
    ['<b>Gras</b> et <script>x</script>', 'Gras et x'],
  ])('%s', (input, expected) => {
    expect(toPlainText(input)).toBe(expected);
  });

  it('keeps the asterisk of the official name Sagittarius A* / Sgr A*', () => {
    expect(toPlainText('*Sagittarius A** est un trou noir.')).toBe('Sagittarius A* est un trou noir.');
    expect(toPlainText('Sgr A* est au centre.')).toBe('Sgr A* est au centre.');
  });

  it('never leaves any other asterisk', () => {
    const samples = ['***x***', '* * *', 'a * b', '**gras* bizarre', '*Pouf !*'];
    for (const sample of samples) expect(toPlainText(sample)).not.toContain('*');
  });

  it('keeps snake_case-like words intact and does not eat apostrophes', () => {
    expect(toPlainText('l’ISS tourne autour de la Terre')).toBe('l’ISS tourne autour de la Terre');
  });
});
