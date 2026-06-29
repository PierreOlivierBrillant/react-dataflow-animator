import { memo, type FC, type MemoExoticComponent } from 'react';

/**
 * A React functional component wrapped in React.memo().
 * This type is used to ensure that components that are animated
 * or rendered recurrently (60 fps) do not re-render unnecessarily.
 */
export type AnimatableComponent<P> = MemoExoticComponent<FC<P>>;

/**
 * Wraps a component in React.memo() and ensures that its return type
 * corresponds exactly to AnimatableComponent<P>.
 * Use this function to export your node or packet components.
 */
export function defineAnimatable<P>(Component: FC<P>): AnimatableComponent<P> {
  return memo(Component);
}
