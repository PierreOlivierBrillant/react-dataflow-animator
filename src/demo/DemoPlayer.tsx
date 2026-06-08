import { DataFlowPlayer, type DataFlowPlayerProps } from '../lib';
import { useSiteTheme } from './theme';

/**
 * Lecteur du site : injecte le thème courant du site dans le DataFlowPlayer,
 * pour que les démos suivent le toggle clair/sombre de l'en-tête.
 */
export function DemoPlayer(props: DataFlowPlayerProps) {
  const { theme } = useSiteTheme();
  return <DataFlowPlayer theme={theme} {...props} />;
}
