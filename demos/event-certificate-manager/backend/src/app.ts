import { fileURLToPath } from "url";
import path, { dirname } from "path";

import { v4 as uuidv4 } from "uuid";
import Koa from "koa";
import cors from "@koa/cors";
import Router from "koa-router";
import serve from "koa-static";
import session from "koa-session";
import { koaBody } from "koa-body";

import adminRoutes from "./admin/routes.js";
import oid4vpRoutes from "./oid4vp/routes.js";
import oid4vciRoutes from "./oid4vci/routes.js";
import routesLogger from "./middleware/routesLogger.js";
import authAdmin, { MemorySession } from "./middleware/adminAuth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];
console.log("file:", __filename);
console.log("dir:", __dirname);

// https://github.com/koajs/session
const CONFIG = {
  key: "koa.sess" /** (string) cookie key (default is koa.sess) */,
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 60 * 60 * 1000,
  autoCommit: true /** (boolean) automatically commit headers (default true) */,
  overwrite: true /** (boolean) can overwrite or not (default true) */,
  httpOnly: true /** (boolean) httpOnly or not (default true) */,
  signed: true /** (boolean) signed or not (default true) */,
  rolling:
    false /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */,
  renew:
    false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false)*/,
  secure: false /** (boolean) secure cookie*/,
};

console.log("CONFIG--------->", CONFIG);

// Simple session implementation for practical use of demo app
export const memorySession: MemorySession = {};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const init = () => {
  const app = new Koa();
  app.proxy = true;

  const frontEnd = process.env.FRONT_END_URL;
  app.use(
    cors({
      origin: frontEnd, // フロントエンドのURL
      credentials: true, // Access-Control-Allow-Credentialsをtrueにする
    }),
  );

  app.keys = ["some secret hurr"]; // todo get from env

  // エラーハンドリングの強化
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      console.error("Server Error:", err);
      if (err instanceof HttpError) {
        ctx.status = err.status;
        ctx.body = { message: err.message };
      } else if (err instanceof Error) {
        ctx.status = 500;
        ctx.body = { message: err.message };
      } else {
        ctx.status = 500;
        ctx.body = { message: "An unknown error occurred" };
      }
    }
  });

  // register middlewares
  // @ts-ignore
  app.use(routesLogger());
  app.use(session(CONFIG, app));
  app.use(authAdmin(memorySession));
  app.use(async (ctx, next) => {
    console.debug("set common response header");
    await next();
    // https://github.com/marmelab/react-admin/tree/master/packages/ra-data-simple-rest#note-about-content-range
    ctx.append("Access-Control-Expose-Headers", "X-Total-Count");
  });

  // register static resources
  app.use(serve(path.join(__dirname, "public")));

  // register routes
  const adminRouter = adminRoutes();
  const oid4vpRouter = oid4vpRoutes();
  const oid4vciRouter = oid4vciRoutes();
  const publicRouter = publicRoutes(memorySession);
  app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
  app.use(adminRouter.routes()).use(adminRouter.allowedMethods());
  app.use(oid4vpRouter.routes()).use(oid4vpRouter.allowedMethods());
  app.use(oid4vciRouter.routes()).use(oid4vciRouter.allowedMethods());

  // register fallback
  app.use((ctx) => {
    console.debug("fallback", ctx);
    // Handler to return bad request for all unhandled paths.
    ctx.response.status = 400;
  });
  return app;
};

const publicRoutes = (memorySession: MemorySession) => {
  const router = new Router();

  router.post("/login", koaBody(), async (ctx: Koa.Context) => {
    const envUsername = process.env.ADMIN_AUTH_USERNAME || "";
    const envPassword = process.env.ADMIN_AUTH_PASSWORD || "";

    // Prevent empty login due to insufficient `.env` file settings.
    if (envUsername == "" || envPassword == "") {
      console.error("Administrator's username and password must be set");
      ctx.status = 401;
      ctx.body = { message: "Invalid username or password" };
      return;
    }

    const { username, password } = ctx.request.body;
    if (username == envUsername && password == envPassword) {
      const sessionId = uuidv4();
      memorySession.sessionId = sessionId;
      ctx.session!.sessionId = sessionId;
      ctx.status = 204;
    } else {
      console.log("Invalid username or password");
      ctx.status = 401;
      ctx.body = { message: "Invalid username or password" };
    }
  });

  return router;
};
