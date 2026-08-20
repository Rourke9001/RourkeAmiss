import { useState } from 'react';

/**
 * The method note behind a metric — the critical-edition apparatus of
 * docs/design-direction.md. Its styling lives with the :global(.provenance)
 * rules in Metric.astro, not here.
 *
 * Defaults to open so the note is in the server-rendered HTML and survives
 * with JavaScript disabled; the island only adds collapsing on top.
 */
export function Provenance({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="provenance">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`How ${label} was measured`}
        onClick={() => setOpen(!open)}
      >
        {open ? 'hide method' : 'how this was measured'}
      </button>
      <p hidden={!open}>{text}</p>
    </div>
  );
}
