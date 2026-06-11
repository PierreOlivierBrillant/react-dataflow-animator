import { defineAnimatable, type AnimatableComponent } from '../../utils/animatable';
import type { DynamicObject, Highlighter } from '../../types';

/** Paquet en mouvement (move). Positionné en absolu au point courant du trajet. */
export interface PacketProps {
  object: DynamicObject;
  x: number;
  y: number;
  /** Opacité (fondu d'apparition/disparition). Défaut: 1. */
  opacity?: number;
  /** Échelle (léger « pop » à l'apparition/disparition). Défaut: 1. */
  scale?: number;
  highlight?: Highlighter;
}

// ---------------------------------------------------------------------------
// SOUS-COMPOSANTS DE PAQUETS
// ---------------------------------------------------------------------------

const HttpPacket = defineAnimatable<{ object: DynamicObject; highlight?: Highlighter }>(({ object, highlight }) => {
  const header = object.packet_content?.header;
  const body = object.packet_content?.body;
  const renderedHeader = header && highlight
    ? <div className="rdfa-packet-header rdfa-code" dangerouslySetInnerHTML={{ __html: highlight(header, 'http') }} />
    : header ? <div className="rdfa-packet-header">{header}</div> : null;
  return (
    <>
      {renderedHeader}
      {body ? (
        <div className="rdfa-packet-body">
          {body.content_type === 'image' ? (
            <img src={body.content} alt="" />
          ) : body.language && highlight && body.content ? (
            <div className="rdfa-packet-surface rdfa-code" dangerouslySetInnerHTML={{ __html: highlight(body.content, body.language) }} />
          ) : (
            <div className="rdfa-packet-surface">{body.content}</div>
          )}
        </div>
      ) : null}
    </>
  );
});

const SqlRequestPacket = defineAnimatable<{ object: DynamicObject; highlight?: Highlighter }>(({ object, highlight }) => {
  const code = object.request_content ?? 'SQL';
  return highlight
    ? <div className="rdfa-packet-header rdfa-code" dangerouslySetInnerHTML={{ __html: highlight(code, 'sql') }} />
    : <div className="rdfa-packet-header">{code}</div>;
});

const SqlResponsePacket = defineAnimatable<{ object: DynamicObject; highlight?: Highlighter }>(({ object }) => {
  const rows = object.response_content?.rows;
  return (
    <div className="rdfa-packet-header">
      {rows != null ? `▦ ${rows} ligne${rows > 1 ? 's' : ''}` : '▦ résultat'}
    </div>
  );
});

// ---------------------------------------------------------------------------
// REGISTRE DES PAQUETS
// ---------------------------------------------------------------------------

/**
 * Registre de tous les types de paquets supportés.
 * Grâce au type AnimatableComponent, TypeScript s'assure que tout nouveau
 * composant ajouté ici est correctement optimisé avec React.memo().
 */
export const packetRegistry: Record<string, AnimatableComponent<{ object: DynamicObject; highlight?: Highlighter }>> = {
  http_packet: HttpPacket,
  sql_request: SqlRequestPacket,
  sql_response: SqlResponsePacket,
};

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------

export const Packet: AnimatableComponent<PacketProps> = defineAnimatable(
  function Packet({ object, x, y, opacity = 1, scale = 1, highlight }: PacketProps) {
    const SpecificPacket = packetRegistry[object.object_type];

    return (
      <div
        className={`rdfa-packet rdfa-packet-${object.object_type}`}
        style={{
          left: x,
          top: y,
          opacity,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {SpecificPacket ? <SpecificPacket object={object} highlight={highlight} /> : null}
      </div>
    );
  }
);
