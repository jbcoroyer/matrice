import type { Metadata, Viewport } from "next";
import { FooterStats, Toaster } from "@/components/Chrome";
import { Masthead } from "@/components/Masthead";
import { ProfileProvider } from "@/components/ProfileProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Le Projectionniste", template: "%s · Le Projectionniste" },
  description: "Revue de cinéma personnelle : recommandations composées à partir de tes notes Letterboxd, films en salles, plateformes et watchlist.",
  applicationName: "Le Projectionniste",
  appleWebApp: { capable: true, title: "Projectionniste", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0b" },
  ],
};

// Applique le thème choisi avant le premier rendu (pas de flash).
const themeScript = `try{var t=JSON.parse(localStorage.getItem("projo.theme"));if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;0,6..96,800;1,6..96,400;1,6..96,600&family=Libre+Franklin:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        <a className="skip" href="#main">
          Aller au contenu
        </a>
        <ProfileProvider>
          <Masthead />
          <main className="wrap" id="main">
            {children}
          </main>
          <footer className="wrap foot">
            <span>
              Données et affiches : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. Plateformes : JustWatch via TMDB. Ce
              produit utilise l'API TMDB sans être approuvé ni certifié par TMDB.
            </span>
            <FooterStats />
          </footer>
          <Toaster />
        </ProfileProvider>
      </body>
    </html>
  );
}
