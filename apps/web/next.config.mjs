/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/db",
    "@workspace/langchain",
    "@workspace/elevenlabs",
    "@workspace/types",
  ],
  experimental: {
    serverComponentsExternalPackages: ["mongodb"],
  },
  serverExternalPackages: ["pdf-parse", "mongodb"],
};

export default nextConfig;
