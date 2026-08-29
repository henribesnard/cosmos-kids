import type { Locale, ObjectDisplay } from '../app/uiTypes';

interface AccessibleObjectListProps {
  locale: Locale;
  objects: ObjectDisplay[];
  onSelect: (id: string) => void;
}

export function AccessibleObjectList({ locale, objects, onSelect }: AccessibleObjectListProps) {
  return (
    <section className="accessible-catalog" aria-label={locale === 'fr' ? 'Liste accessible des mondes visibles' : 'Accessible list of visible worlds'}>
      <h2>{locale === 'fr' ? 'Mondes visibles dans la scène' : 'Worlds visible in the scene'}</h2>
      <ul>{objects.map((object) => <li key={object.id}><button type="button" onClick={() => onSelect(object.id)}>{object.name[locale]} — {object.kind[locale]}</button></li>)}</ul>
    </section>
  );
}

