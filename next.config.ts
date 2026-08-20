import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary resolved via fs at runtime (not a plain
  // `require`) — sem isso o file tracing da Vercel pode não incluir o binário no
  // bundle da function e o transcode de áudio (api/whatsapp/conversations/[id]/audio)
  // quebra em produção.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
