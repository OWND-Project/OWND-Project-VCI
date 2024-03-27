import Koa from "koa";
import auth from "koa-basic-auth";
import { koaBody } from "koa-body";
import Router from "koa-router";

import routesHandler from "./routesHandler.js";

const basicAuthOpts = () => {
  const name = process.env.BASIC_AUTH_USERNAME || "";
  const pass = process.env.BASIC_AUTH_PASSWORD || "";
  return { name, pass };
};
const init = () => {
  const router = new Router();

  router.post(
    "/admin/keys/new",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleNewKey(ctx);
    },
  );
  router.post(
    "/admin/keys/:kid/revoke",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleRevokeKey(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/csr",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleCsr(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/signselfcert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleSignSelfCert(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/registercert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleRegisterCert(ctx);
    },
  );

  router.get(
    "/admin/keys/:kid",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await routesHandler.handleGetKey(ctx);
    },
  );
  return router;
};

export default init;
