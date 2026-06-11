import { defineAnimatable, type AnimatableComponent } from '../../utils/animatable';
import type { DynamicObject } from '../../types';

/** Paquet en mouvement (move). Positionné en absolu au point courant du trajet. */
export interface PacketProps {
  object: DynamicObject;
  x: number;
  y: number;
  /** Opacité (fondu d'apparition/disparition). Défaut: 1. */
  opacity?: number;
  /** Échelle (léger « pop » à l'apparition/disparition). Défaut: 1. */
  scale?: number;
}

// ---------------------------------------------------------------------------
// SOUS-COMPOSANTS DE PAQUETS
// ---------------------------------------------------------------------------

const HttpPacket = defineAnimatable<{ object: DynamicObject }>(({ object }) => {
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
});

const SqlRequestPacket = defineAnimatable<{ object: DynamicObject }>(({ object }) => {
  return <div className="rdfa-packet-header">{object.request_content ?? 'SQL'}</div>;
});

const SqlResponsePacket = defineAnimatable<{ object: DynamicObject }>(({ object }) => {
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
export const packetRegistry: Record<string, AnimatableComponent<{ object: DynamicObject }>> = {
  http_packet: HttpPacket,
  sql_request: SqlRequestPacket,
  sql_response: SqlResponsePacket,
};

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------

export const Packet: AnimatableComponent<PacketProps> = defineAnimatable(
  function Packet({ object, x, y, opacity = 1, scale = 1 }: PacketProps) {
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
        {SpecificPacket ? <SpecificPacket object={object} /> : null}
      </div>
    );
  }
);
