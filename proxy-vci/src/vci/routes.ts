import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import { koaBody } from "koa-body";
import Koa from "koa";
const init = () => {
  const router = new Router();
  router.get("/", routesHandler.handleRootPath);
  router.get("/callback", routesHandler.handleRootPathCallback);
  router.get(
    "/.well-known/openid-credential-issuer",
    routesHandler.handleIssueMetadata,
  );
  router.get(
    "/.well-known/oauth-authorization-server",
    routesHandler.handleAuthServer,
  );
  router.post("/token", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleToken(ctx);
  });
  router.post("/credentials", koaBody(), async (ctx: Koa.Context) => {
    await routesHandler.handleCredential(ctx);
  });
  return router;
};

export default init;
