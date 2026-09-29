"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, SecHead } from "@/components/ui";
import { createAccount, sendReset, setPassword, signIn, signOut } from "@/lib/auth";

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label}
      <input className="input" {...p} />
    </label>
  );
}

function CreateForm() {
  const { sb, setAccount, empty } = useProfile();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          setAccount(await createAccount(sb!, email, pw));
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Créer mon compte</h2>
      <p className="note">
        {empty
          ? "Tu pourras ensuite te connecter depuis n'importe quel navigateur ou appareil."
          : "Tout ce que tu as déjà (historique, journal, listes, réglages) est conservé et rattaché à ce compte. Tu pourras ensuite te connecter de n'importe où."}
      </p>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Mot de passe (8 caractères minimum)" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="btn primary" disabled={busy}>
        {busy ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}

function SignInForm() {
  const { sb, empty } = useProfile();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resetSent, setResetSent] = useState(false);
  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!empty && !confirm("Ce que tu as fait dans ce navigateur sans compte ne sera pas fusionné avec ton compte. Continuer ?")) return;
        setBusy(true);
        setError(null);
        try {
          await signIn(sb!, email, pw);
          location.href = "/decouvrir";
        } catch (err) {
          setError(err);
          setBusy(false);
        }
      }}
    >
      <h2>J'ai déjà un compte</h2>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Mot de passe" type="password" autoComplete="current-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
      {error ? <ErrorLine error={error} /> : null}
      {resetSent ? <p className="note">Si un compte existe pour cette adresse, un email de réinitialisation vient de partir.</p> : null}
      <div className="row-actions">
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        <button
          type="button"
          className="link-btn"
          onClick={async () => {
            if (!email) return setError(new Error("Indique ton email ci-dessus."));
            try {
              await sendReset(sb!, email);
              setResetSent(true);
            } catch (err) {
              setError(err);
            }
          }}
        >
          Mot de passe oublié
        </button>
      </div>
    </form>
  );
}

function NewPassword() {
  const { sb, toast } = useProfile();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<unknown>(null);
  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await setPassword(sb!, pw);
          toast("Mot de passe modifié");
          history.replaceState(null, "", "/compte");
          location.reload();
        } catch (err) {
          setError(err);
        }
      }}
    >
      <h2>Nouveau mot de passe</h2>
      <Field label="Mot de passe (8 caractères minimum)" type="password" autoComplete="new-password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} />
      {error ? <ErrorLine error={error} /> : null}
      <button type="submit" className="btn primary">
        Enregistrer
      </button>
    </form>
  );
}

function Compte() {
  const { status, account, sb } = useProfile();
  const params = useSearchParams();
  if (status !== "ready" || !account) return <Loader text="Chargement…" />;
  if (params.get("reset") && !account.anonymous) return <NewPassword />;

  if (account.anonymous && !account.pendingEmail)
    return (
      <>
        <p className="lede">
          Pour l'instant, tes données sont liées à ce navigateur, et même à cette adresse précise (localhost:3000 et localhost:3001 comptent comme deux
          navigateurs différents). Avec un compte, tu les retrouves partout.
        </p>
        <div className="settings">
          <CreateForm />
          <SignInForm />
        </div>
      </>
    );

  return (
    <div className="auth-form">
      {account.pendingEmail ? (
        <p className="status">
          Presque fini : un email de confirmation a été envoyé à <b>{account.pendingEmail}</b>. Clique sur le lien qu'il contient pour activer ton compte.
          En attendant, tes données restent dans ce navigateur.
        </p>
      ) : (
        <p className="status">
          Connecté en tant que <b>{account.email}</b>. Tes données te suivent sur tous tes appareils.
        </p>
      )}
      <div className="row-actions">
        <button
          type="button"
          className="btn"
          onClick={async () => {
            if (account.pendingEmail && !confirm("Ton compte n'est pas encore confirmé : en te déconnectant maintenant, tu perdrais l'accès à tes données. Continuer ?")) return;
            await signOut(sb!);
            location.href = "/decouvrir";
          }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <section className="section">
      <SecHead as="h1" title="Compte" />
      <Suspense fallback={<Loader text="Chargement…" />}>
        <Compte />
      </Suspense>
    </section>
  );
}
