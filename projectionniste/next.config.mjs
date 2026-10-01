/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // essais depuis un téléphone ou l'émulateur Android sur le même réseau (npm run dev)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  async redirects() {
    return [
      { source: "/pour-toi", destination: "/decouvrir", permanent: true },
      { source: "/decouvrir/pour-toi", destination: "/decouvrir", permanent: true },
      { source: "/humeurs", destination: "/decouvrir", permanent: true },
      { source: "/humeurs/:slug", destination: "/decouvrir/humeurs/:slug", permanent: true },
      // les humeurs sont devenues des sélections (ou l'envie « Ce soir ? » de Découvrir)
      { source: "/decouvrir/humeurs/noir-coreen", destination: "/ensembles/cinema-coreen", permanent: true },
      { source: "/decouvrir/humeurs/animation-japonaise", destination: "/ensembles/studio-10342", permanent: true },
      { source: "/decouvrir/humeurs/:slug", destination: "/decouvrir", permanent: true },
      { source: "/decouvrir/humeurs", destination: "/decouvrir", permanent: true },
      { source: "/salles", destination: "/decouvrir", permanent: true },
      { source: "/decouvrir/salles", destination: "/decouvrir", permanent: true },
      { source: "/reglages", destination: "/parametres", permanent: true },
      // Parcours : les rayons, les cycles et le catalogue au même endroit ; la watchlist est l'onglet « À voir » du Journal
      { source: "/ensembles", destination: "/parcours", permanent: true },
      // le social est retiré : critiques publiques et profils publics
      { source: "/u/:handle", destination: "/decouvrir", permanent: true },
      { source: "/critique/:id", destination: "/decouvrir", permanent: true },
      { source: "/bilan", destination: "/portrait?vue=annee", permanent: true },
      { source: "/watchlist", destination: "/journal?onglet=avoir", permanent: true },
      { source: "/compte", destination: "/parametres", permanent: true },
    ];
  },
};

export default nextConfig;
