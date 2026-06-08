import type { DynamicObject } from '../../types';

/** Paquet en mouvement (move). Positionné en absolu au point courant du trajet. */
export interface PacketProps {
  object: DynamicObject;
  x: number;
  y: number;
}

function PacketInner({ object }: { object: DynamicObject }) {
  switch (object.object_type) {
    case 'http_packet': {
      const header = object.packet_content?.header;
      const body = object.packet_content?.body;
      return (
        <>
          {header ? <div className="rdfa-packet-header">{header}</div> : null}
          {body ? (
            <div className="rdfa-packet-body">
              {body.content_type === 'image' ? (
                <img src={body.content} alt="" />
              ) : (
                body.content
              )}
            </div>
          ) : null}
        </>
      );
    }
    case 'sql_request':
      return <div className="rdfa-packet-header">{object.request_content ?? 'SQL'}</div>;
    case 'sql_response': {
      const rows = object.response_content?.rows;
      return (
        <div className="rdfa-packet-header">
          {rows != null ? `▦ ${rows} ligne${rows > 1 ? 's' : ''}` : '▦ résultat'}
        </div>
      );
    }
    default:
      return null;
  }
}

export function Packet({ object, x, y }: PacketProps) {
  return (
    <div
      className={`rdfa-packet rdfa-packet-${object.object_type}`}
      style={{ left: x, top: y }}
    >
      <PacketInner object={object} />
    </div>
  );
}
