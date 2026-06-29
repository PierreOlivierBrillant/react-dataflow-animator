import { useMemo, useState } from 'react';
import type { Highlighter } from '../types';

export interface JsonDialogProps {
  json: string;
  /** Syntax highlighting (Prism by default), applied to `json` language. */
  highlight: Highlighter;
  onCopy: () => Promise<void>;
  onDownload: () => void;
  onClose: () => void;
}

// Line icons (Feather/Lucide style).
const CopyIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const DownloadIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

/** Modal window displaying the colored JSON spec, with copy and download options. */
export function JsonDialog({
  json,
  highlight,
  onCopy,
  onDownload,
  onClose,
}: JsonDialogProps) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(json, 'json'), [json, highlight]);

  const handleCopy = () => {
    void onCopy().then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false)
    );
  };

  return (
    <div
      className="rdfa-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Spécification JSON"
    >
      <button
        type="button"
        className="rdfa-dialog-backdrop"
        aria-label="Fermer la fenêtre"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="rdfa-dialog">
        <div className="rdfa-dialog-head">
          <span className="rdfa-dialog-title">Spécification JSON</span>
          <button
            type="button"
            className="rdfa-btn"
            onClick={onDownload}
            aria-label="Télécharger le JSON"
            title="Télécharger le JSON"
          >
            {DownloadIcon}
          </button>
          <button
            type="button"
            className={`rdfa-btn rdfa-copy-btn${copied ? ' rdfa-copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? 'Copié' : 'Copier'}
            title="Copier dans le presse-papier"
          >
            {copied ? CheckIcon : CopyIcon}
          </button>
          <button
            type="button"
            className="rdfa-btn"
            onClick={onClose}
            aria-label="Fermer"
            title="Fermer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z" />
            </svg>
          </button>
        </div>
        <pre className="rdfa-dialog-code rdfa-code">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </div>
  );
}
