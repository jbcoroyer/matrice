"use client";

import { useState } from "react";

export function Bio({ text, lang }: { text: string; lang: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 700;
  return (
    <>
      <p className={`bio${long && !open ? " clamp" : ""}`} lang={lang}>
        {text}
      </p>
      {long ? (
        <button type="button" className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Réduire" : "Lire la suite"}
        </button>
      ) : null}
      {lang !== "fr" ? <p className="note">Biographie disponible en anglais seulement.</p> : null}
    </>
  );
}
