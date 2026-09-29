/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/pour-toi", destination: "/decouvrir/pour-toi", permanent: true },
      { source: "/humeurs", destination: "/decouvrir/pour-toi", permanent: true },
      { source: "/humeurs/:slug", destination: "/decouvrir/humeurs/:slug", permanent: true },
      { source: "/decouvrir/humeurs", destination: "/decouvrir/pour-toi", permanent: true },
      { source: "/salles", destination: "/decouvrir", permanent: true },
      { source: "/decouvrir/salles", destination: "/decouvrir", permanent: true },
      { source: "/reglages", destination: "/parametres", permanent: true },
      { source: "/compte", destination: "/parametres", permanent: true },
    ];
  },
};

export default nextConfig;
