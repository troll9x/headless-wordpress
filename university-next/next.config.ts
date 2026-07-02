import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tlu.edu.vn",
      },
      {
        protocol: "https",
        hostname: "www.tlu.edu.vn",
      },
    ],
  },
};

export default nextConfig;