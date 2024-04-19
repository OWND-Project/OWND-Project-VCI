import Koa from "koa";
import auth from "koa-basic-auth";
import { koaBody } from "koa-body";
import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import adminHandler from "../../../common/src/routes/admin/handler.js";

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
        await adminHandler.handleNewKey(ctx)
    },
  );
  router.post(
    "/admin/keys/:kid/revoke",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await adminHandler.handleRevokeKey(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/csr",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await adminHandler.handleCsr(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/signselfcert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await adminHandler.handleSignSelfCert(ctx);
    },
  );

  router.post(
    "/admin/keys/:kid/registercert",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await adminHandler.handleRegisterCert(ctx);
    },
  );

  router.get(
    "/admin/keys/:kid",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await adminHandler.handleGetKey(ctx);
    },
  );

  router.post(
    "/admin/employees/new",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleNewEmployee(ctx);
    },
  );

  router.post(
    "/admin/employees/:employeeNo/credential-offer",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeCredentialOffer(ctx);
    },
  );

  return router;
};

export default init;
