"use client";

import { useEffect, useState } from "react";
import { diaryChanged } from "@/lib/diary";
import { Plus } from "./icons";
import { LogDialog } from "./LogDialog";
import { PickFilm } from "./PickFilm";
import { useProfile, type FilmInput } from "./ProfileProvider";

const OPEN = "projo:quicklog";

/** Ouvre « J'ai vu… » depuis n'importe où : recherche d'un film, puis date, note, critique. */
export const openQuickLog = () => window.dispatchEvent(new Event(OPEN));

/** Bouton « Journaliser » (en-tête, page Journal). */
export function JournalButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`btn primary log-btn ${className}`} onClick={openQuickLog}>
      <Plus />
      Journaliser
    </button>
  );
}

/** Monté une fois dans la page : écoute la demande d'ouverture et enchaîne recherche puis journal. */
export function QuickLogHost() {
  const { status } = useProfile();
  const [step, setStep] = useState<"off" | "pick" | FilmInput>("off");
  useEffect(() => {
    const on = () => setStep("pick");
    window.addEventListener(OPEN, on);
    return () => window.removeEventListener(OPEN, on);
  }, []);
  if (status !== "ready" || step === "off") return null;
  if (step === "pick") return <PickFilm title="Quel film as-tu vu ?" onPick={(m) => setStep(m)} onClose={() => setStep("off")} />;
  return <LogDialog film={step} onClose={() => setStep("off")} onSaved={() => diaryChanged(step.id)} />;
}
