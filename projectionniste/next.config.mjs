/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
      { source: "/compte", destination: "/parametres", permanent: true },
    ];
  },
};

export default nextConfig;
