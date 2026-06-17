/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal standalone server for small Docker images.
  output: "standalone",
};

export default nextConfig;
