import { router } from "./trpc"
import { searchRouter } from "./routers/search"

export const appRouter = router({
  search: searchRouter,
})

export type AppRouter = typeof appRouter
