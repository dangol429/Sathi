import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This project sits inside a OneDrive folder that has lockfiles above it;
  // pin the trace root so Next does not pick the wrong workspace.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
