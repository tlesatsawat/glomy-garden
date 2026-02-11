/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode for Game Engine stability in Development
  // This prevents double-mounting of the Canvas component which can cause 
  // double game loops or asset fetching issues during hot-reload.
  reactStrictMode: false,
  
  // Standalone output for Docker/Vercel optimization
  output: 'standalone',

  // Hook specific headers if needed (e.g., CORS for API)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default nextConfig;