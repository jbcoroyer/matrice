import type { Metadata, Viewport } from "next";
import "@fontsource-variable/urbanist";
import { AuthGate } from "@/components/AuthScreen";
import { ConfirmHost, SessionBanner, Toaster } from "@/components/Chrome";
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
  icons: { apple: "/icons/apple-touch-icon.png" },
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
