"use client";

import { errorText } from "@/lib/errors";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader } from "@/components/ui";
import { setPassword, signOut } from "@/lib/auth";
import { updateProfile } from "@/lib/db";
import { AccountData } from "@/components/AccountData";
import { LetterboxdImport } from "@/components/LetterboxdImport";
import { openWelcome } from "@/components/Welcome";
import { useTheme, type ThemeMode } from "@/lib/theme";

function ProfileName() {
  const { sb, userId, profile, reload, toast } = useProfile();
  const [name, setName] = useState(profile?.owner ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== (profile?.owner ?? "");
  return (
    <form
      className="stack-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateProfile(sb!, userId!, { display_name: name.trim() || null });
          await reload();
          toast("Nom enregistré");
        } catch (err) {
          toast(`Échec : ${errorText(err)}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        Nom affiché
        <input className="input" value={name} maxLength={60} placeholder="Ton prénom ou un pseudo" onChange={(e) => setName(e.target.value)} />
      </label>
      {dirty ? (
        <div className="row-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            Enregistrer
          </button>
        </div>
      ) : null}
    </form>
  );
}

function Appearance() {
  const [mode, setMode] = useTheme();
  const opts: { k: ThemeMode; l: string }[] = [
    { k: "dark", l: "Sombre" },
    { k: "light", l: "Clair" },
    { k: "system", l: "Selon l'appareil" },
  ];
  return (
    <div className="seg" role="radiogroup" aria-label="Thème">
      {opts.map((o) => (
        <button key={o.k} type="button" role="radio" aria-checked={mode === o.k} onClick={() => setMode(o.k)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Password({ highlight }: { highlight?: boolean }) {
  const { sb, toast } = useProfile();
  const [open, setOpen] = useState(!!highlight);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<unknown>(null);
  if (!open)
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Changer de mot de passe
      </button>
    );
  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        try {
          await setPassword(sb!, pw);
          toast("Mot de passe modifié");
          setPw("");
          setOpen(false);
          if (highlight) history.replaceState(null, "", "/parametres");
        } catch (err) {
          setError(err);
        }
      }}
    >
      <label className="block">
        {highlight ? "Choisis ton nouveau mot de passe" : "Nouveau mot de passe"}
        <input className="input" type="password" autoComplete="new-password" minLength={8} required autoFocus={highlight} value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      {error ? <ErrorLine error={error} /> : null}
      <div className="row-actions">
        <button type="submit" className="btn primary">
          Enregistrer
        </button>
        {!highlight ? (
          <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}

const SECTIONS = [
  { id: "profil", l: "Nom" },
  { id: "import", l: "Import Letterboxd" },
  { id: "apparence", l: "Apparence" },
  { id: "presentation", l: "Présentation" },
  { id: "compte", l: "Compte" },
  { id: "donnees", l: "Mes données" },
];

function Settings() {
  const { account, sb } = useProfile();
  const reset = useSearchParams().get("reset") === "1";
  const [active, setActive] = useState("profil");
  const refs = useRef<Record<string, HTMLElement | null>>({});

  // surligne la section visible dans le menu latéral
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const sec = (id: string, title: string, desc: string | null, children: React.ReactNode) => (
    <section id={id} ref={(el) => void (refs.current[id] = el)} className="set-sec">
      <h2>{title}</h2>
      {desc ? <p className="note">{desc}</p> : null}
      {children}
    </section>
  );

  return (
    <div className="settings-page">
      <nav className="set-nav" aria-label="Sections">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? "true" : undefined}>
            {s.l}
          </a>
        ))}
      </nav>
      <div className="set-body">
        <h1>Paramètres</h1>
        {reset ? (
          <section className="set-sec callout">
            <Password highlight />
          </section>
        ) : null}
        {sec(
          "profil",
          "Nom affiché",
          null,
          <>
            <ProfileName />
          </>,
        )}
        {sec("import", "Import Letterboxd", null, <LetterboxdImport />)}
        {sec("apparence", "Apparence", null, <Appearance />)}
        {sec(
          "presentation",
          "Présentation",
          "Les quelques écrans qui expliquent Filmable, et l'import de ton Letterboxd.",
          <button type="button" className="btn" onClick={openWelcome}>
            Revoir la présentation
          </button>,
        )}
        {sec(
          "compte",
          "Compte",
          null,
          <>
            <p className="kv">
              <span>Email</span>
              <b>{account?.email}</b>
            </p>
            <div className="row-actions">
              <Password />
              <button
                type="button"
                className="btn ghost"
                onClick={async () => {
                  await signOut(sb!);
                  location.href = "/";
                }}
              >
                Se déconnecter
              </button>
            </div>
          </>,
        )}
        {sec("donnees", "Mes données", "Les récupérer ou supprimer ton compte.", <AccountData />)}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loader text="Chargement…" />}>
      <Settings />
    </Suspense>
  );
}
