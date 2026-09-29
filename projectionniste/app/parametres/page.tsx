"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader } from "@/components/ui";
import { setPassword, signOut } from "@/lib/auth";
import { updateProfile } from "@/lib/db";
import { useAsync } from "@/lib/hooks";
import { importLetterboxd, type Progress } from "@/lib/letterboxd";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { img, tmdb } from "@/lib/tmdb";
import type { Provider } from "@/lib/types";

function Platforms() {
  const { platforms, updateSettings } = useProfile();
  const [all, setAll] = useState(false);
  const list = useAsync(
    async () => {
      const r = await tmdb<{ results: Provider[] & { display_priorities?: Record<string, number> }[] }>("watch/providers/movie", { watch_region: "FR" });
      return (r.results as (Provider & { display_priorities?: Record<string, number> })[]).sort(
        (a, b) => (a.display_priorities?.FR ?? 99) - (b.display_priorities?.FR ?? 99),
      );
    },
    [],
  );
  const toggle = (id: number) => updateSettings({ platforms: platforms.has(id) ? [...platforms].filter((x) => x !== id) : [...platforms, id] });
  if (list.error) return <ErrorLine error={list.error} onRetry={list.reload} />;
  if (!list.data) return <Loader text="Chargement des plateformes…" />;
  const shown = all ? list.data : list.data.filter((p, i) => i < 24 || platforms.has(p.provider_id));
  return (
    <>
      <div className="plat-grid">
        {shown.map((p) => (
          <button key={p.provider_id} type="button" className="plat" aria-pressed={platforms.has(p.provider_id)} onClick={() => toggle(p.provider_id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img(p.logo_path, "w92")} alt="" loading="lazy" />
            {p.provider_name}
          </button>
        ))}
      </div>
      {list.data.length > 24 ? (
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={() => setAll((a) => !a)}>
            {all ? "Moins de plateformes" : `Toutes les plateformes (${list.data.length})`}
          </button>
        </div>
      ) : null}
    </>
  );
}

function LetterboxdImport() {
  const { sb, userId, reload, profile } = useProfile();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (files: File[]) => {
    if (!files.length || busy || !sb || !userId) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const r = await importLetterboxd(sb, userId, files, setProgress);
      await reload();
      const n = (x: number) => x.toLocaleString("fr-FR");
      setMsg(
        `Import terminé : ${n(r.watched)} films vus, ${n(r.rated)} notes, ${n(r.diary)} entrées de journal (dont ${n(r.reviews)} critiques), ` +
          `${n(r.watchlist)} en watchlist, ${n(r.lists)} listes.` +
          (r.missed.length ? ` ${r.missed.length} titres introuvables sur TMDB (${r.missed.slice(0, 3).join(", ")}${r.missed.length > 3 ? "…" : ""}).` : ""),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <>
      <ol className="steps">
        <li>
          Sur Letterboxd, ouvre{" "}
          <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener">
            Settings → Data
          </a>{" "}
          et clique sur <b>Export your data</b>.
        </li>
        <li>Dépose ici l'archive <b>.zip</b> reçue, sans la décompresser.</li>
      </ol>
      <p className="note">
        Journal, notes, critiques, likes, watchlist, listes et favoris sont repris, et tes goûts réappris. Réimporter plus tard met à jour sans doublons.
        {profile?.importedAt ? ` Dernier import : ${new Date(profile.importedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.` : ""}
      </p>
      <label
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          run([...e.dataTransfer.files]);
        }}
      >
        <input ref={input} type="file" accept=".zip,.csv,text/csv,application/zip" multiple disabled={busy} onChange={(e) => run([...(e.target.files ?? [])])} />
        <b>{busy ? "Import en cours…" : "Déposer l'export Letterboxd"}</b>
        <span className="note">ou cliquer pour choisir le fichier</span>
      </label>
      {progress ? (
        <>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <i style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <p className="note">
            {progress.phase}… {progress.total > 1 ? `${progress.done.toLocaleString("fr-FR")} / ${progress.total.toLocaleString("fr-FR")}` : ""}
          </p>
        </>
      ) : null}
      {msg ? <p className="status">{msg}</p> : null}
      {error ? <ErrorLine error={error} /> : null}
    </>
  );
}

function Hidden() {
  const { hidden, titles, toggleHidden } = useProfile();
  if (!hidden.size) return <p className="note">Aucun film écarté. « Pas pour moi », sur une fiche, retire un film de toutes les sélections.</p>;
  return (
    <div className="hidden-list">
      {[...hidden].map((id) => (
        <button key={id} type="button" title="Proposer à nouveau" onClick={() => toggleHidden({ id, title: titles[id] || `Film ${id}` })}>
          {titles[id] || `Film ${id}`}
        </button>
      ))}
    </div>
  );
}

function ProfileName() {
  const { sb, userId, profile, reload, toast } = useProfile();
  const [name, setName] = useState(profile?.owner ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== (profile?.owner ?? "");
  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateProfile(sb!, userId!, { display_name: name.trim() || null });
          await reload();
          toast("Nom enregistré");
        } catch (err) {
          toast(`Échec : ${(err as Error).message}`);
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
        <button type="submit" className="btn primary" disabled={busy}>
          Enregistrer
        </button>
      ) : null}
    </form>
  );
}

function Appearance() {
  const [mode, setMode] = useTheme();
  const opts: { k: ThemeMode; l: string }[] = [
    { k: "system", l: "Automatique" },
    { k: "light", l: "Clair" },
    { k: "dark", l: "Sombre" },
  ];
  return (
    <div className="choice" role="radiogroup" aria-label="Thème">
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
  { id: "profil", l: "Profil" },
  { id: "plateformes", l: "Plateformes" },
  { id: "import", l: "Import Letterboxd" },
  { id: "apparence", l: "Apparence" },
  { id: "ecartes", l: "Films écartés" },
  { id: "compte", l: "Compte" },
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
        {sec("profil", "Profil", null, <ProfileName />)}
        {sec("plateformes", "Plateformes", "Coche tes abonnements : leurs logos passent en premier, et le filtre « Sur mes plateformes » s'appuie dessus.", <Platforms />)}
        {sec("import", "Import Letterboxd", null, <LetterboxdImport />)}
        {sec("apparence", "Apparence", null, <Appearance />)}
        {sec("ecartes", "Films écartés", null, <Hidden />)}
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
