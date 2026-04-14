import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: ["recharts", "lucide-react"]
};

export default nextConfig;
