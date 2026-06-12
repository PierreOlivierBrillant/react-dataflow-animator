import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Packet as PacketSpec, Highlighter } from '../../types';

/** Paquet en mouvement (move). Positionné en absolu au point courant du trajet. */
export interface PacketProps {
  object: PacketSpec;
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

const HttpPacket = defineAnimatable<{
  object: PacketSpec;
  highlight?: Highlighter;
}>(({ object, highlight }) => {
  const header = object.packet_content?.header;
  const body = object.packet_content?.body;
  const renderedHeader =
    header && highlight ? (
      <div
        className="rdfa-packet-header rdfa-code"
        dangerouslySetInnerHTML={{ __html: highlight(header, 'http') }}
      />
    ) : header ? (
      <div className="rdfa-packet-header">{header}</div>
    ) : null;
  return (
    <>
      {renderedHeader}
      {body ? (
        <div className="rdfa-packet-body">
          {body.content_type === 'image' ? (
            <img src={body.content} alt="" />
          ) : body.language && highlight && body.content ? (
            <div
              className="rdfa-packet-surface rdfa-code"
              dangerouslySetInnerHTML={{
                __html: highlight(body.content, body.language),
              }}
            />
          ) : (
            <div className="rdfa-packet-surface">{body.content}</div>
          )}
        </div>
      ) : null}
    </>
  );
});

const SqlRequestPacket = defineAnimatable<{
  object: PacketSpec;
  highlight?: Highlighter;
}>(({ object, highlight }) => {
  const code = object.request_content ?? 'SQL';
  return highlight ? (
    <div
      className="rdfa-packet-header rdfa-code"
      dangerouslySetInnerHTML={{ __html: highlight(code, 'sql') }}
    />
  ) : (
    <div className="rdfa-packet-header">{code}</div>
  );
});

const SqlResponsePacket = defineAnimatable<{
  object: PacketSpec;
  highlight?: Highlighter;
}>(({ object }) => {
  const content = object.response_content;
  const rowsLegacy = content?.rows;
  const header = content?.header;
  const body = content?.body;

  const defaultHeader =
    rowsLegacy != null
      ? `▦ ${rowsLegacy} ligne${rowsLegacy > 1 ? 's' : ''}`
      : '▦ résultat';
  const displayedHeader = header || defaultHeader;

  return (
    <>
      <div className="rdfa-packet-header">{displayedHeader}</div>
      {body && (
        <div className="rdfa-packet-body">
          {body.content_type === 'text' ? (
            <div className="rdfa-packet-surface">{body.content}</div>
          ) : body.content_type === 'table' ? (
            <div className="rdfa-packet-surface rdfa-sql-table-wrapper">
              <table className="rdfa-sql-table">
                {body.columns && (
                  <thead>
                    <tr>
                      {body.columns.map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                {body.rows_data && (
                  <tbody>
                    {body.rows_data.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          ) : null}
        </div>
      )}
    </>
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
const packetRegistry: Record<
  string,
  AnimatableComponent<{ object: PacketSpec; highlight?: Highlighter }>
> = {
  http_packet: HttpPacket,
  sql_request: SqlRequestPacket,
  sql_response: SqlResponsePacket,
};

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------

export const Packet: AnimatableComponent<PacketProps> = defineAnimatable(
  function Packet({
    object,
    x,
    y,
    opacity = 1,
    scale = 1,
    highlight,
  }: PacketProps) {
    const SpecificPacket = packetRegistry[object.kind];

    return (
      <div
        className={`rdfa-packet rdfa-packet-${object.kind}`}
        style={{
          left: x,
          top: y,
          opacity,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {SpecificPacket ? (
          <SpecificPacket object={object} highlight={highlight} />
        ) : null}
      </div>
    );
  }
);
