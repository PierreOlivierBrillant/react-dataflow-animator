import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Packet as PacketSpec, Highlighter } from '../../types';

/** Moving packet. Positioned absolutely at the current point of the path. */
export interface PacketProps {
  object: PacketSpec;
  x: number;
  y: number;
  /** Opacity (fade in/out). Default: 1. */
  opacity?: number;
  /** Scale (slight "pop" on appearance/disappearance). Default: 1. */
  scale?: number;
  highlight?: Highlighter;
}

// ---------------------------------------------------------------------------
// PACKET SUB-COMPONENTS
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
          {body.type === 'image' ? (
            <img src={body.value} alt="" />
          ) : body.language && highlight && body.value ? (
            <div
              className="rdfa-packet-surface rdfa-code"
              dangerouslySetInnerHTML={{
                __html: highlight(body.value, body.language),
              }}
            />
          ) : (
            <div className="rdfa-packet-surface">{body.value}</div>
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
          {body.type === 'text' ? (
            <div className="rdfa-packet-surface">{body.value}</div>
          ) : body.type === 'table' ? (
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
// PACKET REGISTRY
// ---------------------------------------------------------------------------

/**
 * Registry of all supported packet types.
 * Thanks to the AnimatableComponent type, TypeScript ensures that any new
 * component added here is correctly optimized with React.memo().
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
// MAIN COMPONENT
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
