"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, Loader, SecHead } from "@/components/ui";
import { setPassword, signOut } from "@/lib/auth";

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      {label}
      <input className="input" {...p} />
    </label>
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
            location.href = "/";
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
