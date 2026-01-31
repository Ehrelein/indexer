import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@/server/root"

function getBaseUrl() {
  if (typeof window !== "undefined") return ""
  return process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000"
}

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getBaseUrl() + "/api/trpc",
    }),
  ],
})
