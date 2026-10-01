import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/urbanist";
import { AuthGate } from "@/components/AuthScreen";
import { ConfirmHost, FooterStats, SessionBanner, Toaster } from "@/components/Chrome";
import { Masthead, TabBar } from "@/components/Masthead";
import { Welcome } from "@/components/Welcome";
import { Wordmark } from "@/components/Wordmark";
import { BRAND } from "@/lib/brand";
import { ProfileProvider } from "@/components/ProfileProvider";
import { QuickLogHost } from "@/components/QuickLog";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "black-translucent" },
  ...(BRAND.url ? { metadataBase: new URL(BRAND.url) } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0c0e",
};

// Applique le thème choisi avant le premier rendu (pas de flash) : sombre par défaut.
const themeScript = `try{var t=JSON.parse(localStorage.getItem("projo.theme"));if(t==="light"||(t==="system"&&matchMedia("(prefers-color-scheme: light)").matches))document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://image.tmdb.org" />
      </head>
      <body>
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        <ProfileProvider>
          <Masthead />
          <Welcome />
          <main className="wrap" id="main">
            <AuthGate>{children}</AuthGate>
          </main>
          <footer className="wrap">
            <div className="foot">
              <span>
                <span className="brand">
                  <Wordmark />
                </span>
                Données et images : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB.
              </span>
              <nav className="foot-links" aria-label="Informations légales">
                <Link href="/mentions-legales">Mentions légales</Link>
                <Link href="/confidentialite">Confidentialité</Link>
                <Link href="/conditions">Conditions</Link>
              </nav>
              <FooterStats />
            </div>
          </footer>
          <TabBar />
          <QuickLogHost />
          <Toaster />
          <SessionBanner />
          <ConfirmHost />
        </ProfileProvider>
      </body>
    </html>
  );
}
