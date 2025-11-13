import Koa from "koa";
import auth from "koa-basic-auth";
import { koaBody } from "koa-body";
import Router from "koa-router";

import routesHandler from "./routesHandler.js";
import commonAdminRoutes from "ownd-vci-common/dist/routes/admin/routes.js";
import { basicAuthOpts } from "ownd-vci-common/dist/routes/common.js";

const init = () => {
  const router = new Router();

  commonAdminRoutes.setupCommonRoute(router);

  // Employee Management UI Routes
  router.get(
    "/admin/employees",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeesList(ctx);
    },
  );

  router.get(
    "/admin/employees/new",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeNewForm(ctx);
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

  router.get(
    "/admin/employees/:id/edit",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeEditForm(ctx);
    },
  );

  router.post(
    "/admin/employees/:id/update",
    auth(basicAuthOpts()),
    koaBody(),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeUpdate(ctx);
    },
  );

  router.delete(
    "/admin/employees/:id",
    auth(basicAuthOpts()),
    async (ctx: Koa.Context) => {
      await routesHandler.handleEmployeeDelete(ctx);
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
