import { memo, useLayoutEffect, useRef, useState } from 'react';
import { clamp } from '@react-dataflow-animator/core/engine/timeline';
import type { NodeGeom } from '@react-dataflow-animator/core/engine/geometry';
import { richText } from '../tex/RichText';

export const CommentBubble = memo(function CommentBubble({
  node,
  text,
  opacity,
  stageW,
  stageH,
}: {
  node?: NodeGeom;
  text: string;
  opacity: number;
  stageW: number;
  stageH: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.offsetWidth, h: el.offsetHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PAD = 8;

  if (!node) {
    // Omniscient: centered at the top of the stage, without bubble tail.
    let left = stageW / 2 - size.w / 2;
    if (size.w > 0 && stageW > 0) {
      left = clamp(left, PAD, Math.max(PAD, stageW - size.w - PAD));
    }
    return (
      <div
        ref={ref}
        className="rdfa-comment rdfa-comment--omniscient"
        style={{
          left,
          top: PAD,
          opacity,
          visibility: size.w === 0 || size.h === 0 ? 'hidden' : 'visible',
        }}
      >
        {richText(text)}
      </div>
    );
  }

  const nodeTop = node.y - node.height / 2;
  const nodeBottom = node.y + node.height / 2;
  const below = size.h > 0 && nodeTop - 8 - size.h < PAD;

  let top = below ? nodeBottom + 8 : nodeTop - 8 - size.h;
  if (size.h > 0 && stageH > 0) {
    top = clamp(top, PAD, Math.max(PAD, stageH - size.h - PAD));
  }
  let left = node.x - size.w / 2;
  if (size.w > 0 && stageW > 0) {
    left = clamp(left, PAD, Math.max(PAD, stageW - size.w - PAD));
  }
  const tailX = size.w > 0 ? clamp(node.x - left, 14, size.w - 14) : size.w / 2;

  return (
    <div
      ref={ref}
      className={`rdfa-comment${below ? ' rdfa-comment--below' : ''}`}
      style={{
        left,
        top,
        opacity,
        visibility: size.w === 0 || size.h === 0 ? 'hidden' : 'visible',
      }}
    >
      {text}
      <span className="rdfa-comment-tail" style={{ left: tailX }} />
    </div>
  );
});
