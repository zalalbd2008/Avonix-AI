import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

/** Every Better Auth endpoint — sign-in, sign-up, sign-out, session, callbacks. */
export const { GET, POST } = toNextJsHandler(auth.handler);
