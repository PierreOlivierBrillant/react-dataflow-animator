import { DataFlowPlayer, type DataFlowPlayerProps } from 'react-dataflow-animator';

export function DemoPlayer(props: DataFlowPlayerProps) {
  return <DataFlowPlayer theme="auto" {...props} />;
}
