/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/pour-toi", destination: "/decouvrir", permanent: true },
      { source: "/humeurs", destination: "/decouvrir/humeurs", permanent: true },
      { source: "/humeurs/:slug", destination: "/decouvrir/humeurs/:slug", permanent: true },
      { source: "/salles", destination: "/decouvrir/salles", permanent: true },
    ];
  },
};

export default nextConfig;
