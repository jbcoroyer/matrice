import type { Metadata, Viewport } from "next";
import "@fontsource-variable/urbanist";
import { AuthGate } from "@/components/AuthScreen";
import { ConfirmHost, FooterStats, SessionBanner, Toaster } from "@/components/Chrome";
import { Masthead, TabBar } from "@/components/Masthead";
import { ProfileProvider } from "@/components/ProfileProvider";
import { QuickLogHost } from "@/components/QuickLog";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Filmable", template: "%s · Filmable" },
  description: "Ton journal de cinéma, tes critiques, tes listes et ta collection, avec import Letterboxd.",
  applicationName: "Filmable",
  appleWebApp: { capable: true, title: "Filmable", statusBarStyle: "black-translucent" },
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
          <main className="wrap" id="main">
            <AuthGate>{children}</AuthGate>
          </main>
          <footer className="wrap">
            <div className="foot">
              <span>
                <span className="brand">
                  Film<span>able</span>
                </span>
                Données et images : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. Filmable utilise l'API TMDB sans être
                approuvé ni certifié par TMDB.
              </span>
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
