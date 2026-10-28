import type { NextConfig } from "next";

// Kept deliberately minimal. (The scaffold turned on `cacheComponents`, an opt-in
// caching model that forces extra Suspense rules on every page that reads data at
// request time. This app does not need it, so it is off.)
const nextConfig: NextConfig = {};

export default nextConfig;
