import { memo, type FC, type MemoExoticComponent } from 'react';

/**
 * Un composant fonctionnel React enveloppé dans React.memo().
 * Ce type est utilisé pour garantir que les composants qui sont animés
 * ou rendus de manière récurrente (60 fps) ne se re-rendent pas inutilement.
 */
export type AnimatableComponent<P> = MemoExoticComponent<FC<P>>;

/**
 * Enveloppe un composant dans React.memo() et garantit que son type de retour
 * correspond exactement à AnimatableComponent<P>.
 * Utilisez cette fonction pour exporter vos composants de nœuds ou de paquets.
 */
export function defineAnimatable<P>(Component: FC<P>): AnimatableComponent<P> {
  return memo(Component);
}
