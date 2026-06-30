import {
  defineAnimatable,
  type AnimatableComponent,
} from '../../utils/animatable';
import type { Packet as PacketSpec, Highlighter } from '../../types';
import { NodePanel } from '../nodes/NodePanel';
import { isPanelNode } from '../nodes/nodeKinds';
import { getSubIcon } from '../nodes/subIcons';
import { escapeHtml } from '../../highlight/highlight';

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

/**
 * `simple_node` / `complex_node` packet: a text panel that travels. Reuses the
 * static node's `NodePanel` so the look and the content fields (`body`,
 * `header`, `language`) match exactly — no duplicated rendering. `object.kind`
 * doubles as the panel `type` (both literals belong to `NodeType` too).
 */
const PanelPacket = defineAnimatable<{
  object: PacketSpec;
  highlight?: Highlighter;
}>(({ object, highlight }) => {
  const type = object.kind === 'complex_node' ? 'complex_node' : 'simple_node';
  return (
    <NodePanel
      object={{
        type,
        header: object.header,
        body: object.body,
        language: object.language,
      }}
      highlight={highlight ?? escapeHtml}
    />
  );
});

/**
 * `subicon` packet: the node's tech badge that travels. Reuses `getSubIcon` —
 * the very resolver behind the node's corner badge — so a known technology, a
 * registered icon or a short free-text badge can fly via `icon`, with no
 * duplicated icon table.
 */
const SubIconPacket = defineAnimatable<{
  object: PacketSpec;
  highlight?: Highlighter;
}>(({ object }) => (
  <span className="rdfa-node-subicon">{getSubIcon(object.icon ?? '')}</span>
));

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
  simple_node: PanelPacket,
  complex_node: PanelPacket,
  subicon: SubIconPacket,
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
    // A panel-kind packet draws its own box (NodePanel) and a subicon packet
    // is a round badge; both replace the wrapper's default box via a modifier
    // (panel strips it, subicon makes it a circle). Other kinds keep the box.
    const modifier = isPanelNode(object.kind)
      ? ' rdfa-packet--panel'
      : object.kind === 'subicon'
        ? ' rdfa-packet--subicon'
        : '';

    return (
      <div
        className={`rdfa-packet rdfa-packet-${object.kind}${modifier}`}
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
