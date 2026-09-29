import type { Metadata, Viewport } from "next";
import { AuthGate } from "@/components/AuthScreen";
import { FooterStats, Toaster } from "@/components/Chrome";
import { Masthead } from "@/components/Masthead";
import { ProfileProvider } from "@/components/ProfileProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Le Projectionniste", template: "%s · Le Projectionniste" },
  description: "Journal de cinéma, watchlist et recommandations calées sur tes goûts, avec import Letterboxd.",
  applicationName: "Le Projectionniste",
  appleWebApp: { capable: true, title: "Projectionniste", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

// Applique le thème choisi avant le premier rendu (pas de flash).
const themeScript = `try{var t=JSON.parse(localStorage.getItem("projo.theme"));if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

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
              Données et affiches : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a> (plateformes : JustWatch). Ce site utilise
              l'API TMDB sans être approuvé ni certifié par TMDB.
            </span>
            <FooterStats />
           </div>
          </footer>
          <Toaster />
        </ProfileProvider>
      </body>
    </html>
  );
}
