import { useState } from 'react';

/**
 * The method apparatus, disclosed. Docs/design-direction.md describes this as
 * a critical-edition apparatus: a superscript siglum, a small mono note. The
 * apparatus IS this component's styling (see the :global(.provenance) rules
 * in Metric.astro) — the component contract itself stays exactly what
 * tests/unit/provenance.test.tsx demands: a button with aria-expanded and an
 * aria-label naming the metric, defaulting to expanded so the note is present
 * in the server-rendered HTML and survives with JavaScript disabled. The
 * island only adds collapse behaviour on top of that.
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
