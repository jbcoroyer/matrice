import type { CapacitorConfig } from "@capacitor/cli";

// L'appli mobile est une coque Capacitor qui affiche le site (Next.js) : une seule base de code.
// - Essais : CAP_SERVER_URL=http://<ip-du-pc>:3000 (le site tourne avec `npm run dev` sur le PC)
// - Publication : CAP_SERVER_URL=https://<ton-domaine> (le site hébergé)
// Voir MOBILE.md. L'identifiant (appId) ne change plus une fois l'appli publiée dans les stores.
const url = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.fillmography.app",
  appName: "Fillmography",
  webDir: "mobile/www", // page de secours si le site est injoignable
  backgroundColor: "#0c0c0e",
  ...(url ? { server: { url, cleartext: url.startsWith("http://"), androidScheme: "https" } } : {}),
  ios: { contentInset: "never", backgroundColor: "#0c0c0e" },
  android: { backgroundColor: "#0c0c0e", allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#0c0c0e", showSpinner: false, launchAutoHide: true },
    StatusBar: { style: "DARK", backgroundColor: "#0c0c0e", overlaysWebView: false },
  },
};

export default config;
