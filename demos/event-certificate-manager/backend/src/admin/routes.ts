import Koa from "koa";
import { koaBody } from "koa-body";
import Router from "koa-router";

import commonAdminRoutes from "ownd-vci/dist/routes/admin/routes.js";
import { handleNotSuccessResult } from "ownd-vci/dist/routes/common.js";
import {
  registerEvent,
  getAllEvents,
  getEventById,
  updateEventById,
  credentialOfferForEventTicket,
  allTickets,
  getTicketById,
  updateTicketById,
  allParticipation,
  getParticipationById,
} from "./routesHandler.js";

const init = () => {
  const appName = process.env.APP_NAME || "";
  const router = new Router();

  commonAdminRoutes.setupCommonRoute(router);

  router.post(
    `/admin/${appName}/events`,
    koaBody(),
    async (ctx: Koa.Context) => {
      if (!ctx.request.body) {
        ctx.body = { status: "error", message: "Invalid data received!" };
        ctx.status = 400;
        return;
      }
      const event = ctx.request.body;

      const result = await registerEvent(event);
      if (result.ok) {
        ctx.status = 201;
        ctx.body = result.payload;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.get(`/admin/${appName}/events`, async (ctx: Koa.Context) => {
    const query = ctx.query;
    const sort =
      typeof query.sort === "string"
        ? JSON.parse(query.sort)
        : ["startDate", "ASC"];
    const sortField = sort[0];
    const sortOrder = sort[1];

    const result = await getAllEvents(sortField, sortOrder);
    if (result.ok) {
      ctx.body = result.payload;
      ctx.status = 200;
      ctx.append("X-Total-Count", String(result.payload.length)); // payloadがEvent[]の場合のみlengthを参照
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  router.get(`/admin/${appName}/events/:id`, async (ctx: Koa.Context) => {
    const { id } = ctx.params;
    const result = await getEventById(id);
    if (result.ok) {
      if (result.payload) {
        ctx.body = result.payload;
        ctx.status = 200;
      } else {
        ctx.status = 404;
      }
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  // PUT リクエストのルートを追加
  router.put(
    `/admin/${appName}/events/:id`,
    koaBody(),
    async (ctx: Koa.Context) => {
      const { id } = ctx.params;
      const event = ctx.request.body;
      const result = await updateEventById(id, event);
      if (result.ok) {
        ctx.status = 200;
        ctx.body = result.payload;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.post(
    `/admin/${appName}/tickets`,
    koaBody(),
    async (ctx: Koa.Context) => {
      const payload = ctx.request.body;
      const result = await credentialOfferForEventTicket(payload);
      if (result.ok) {
        ctx.body = result.payload;
        ctx.status = 201;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.get(`/admin/${appName}/tickets`, async (ctx: Koa.Context) => {
    const result = await allTickets();
    if (result.ok) {
      ctx.body = result.payload;
      ctx.status = 200;
      ctx.append("X-Total-Count", result.payload.length.toString());
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  router.get(`/admin/${appName}/tickets/:id`, async (ctx: Koa.Context) => {
    const { id } = ctx.params;
    const result = await getTicketById(id);
    if (result.ok) {
      if (result.payload) {
        ctx.body = result.payload;
        ctx.status = 200;
      } else {
        ctx.status = 404;
      }
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  router.put(
    `/admin/${appName}/tickets/:id`,
    koaBody(),
    async (ctx: Koa.Context) => {
      const { id } = ctx.params;
      const payload = ctx.request.body;
      const result = await updateTicketById(id, payload);
      if (result.ok) {
        ctx.body = result.payload;
        ctx.status = 200;
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );

  router.get(`/admin/${appName}/participation`, async (ctx: Koa.Context) => {
    const result = await allParticipation();
    if (result.ok) {
      ctx.body = result.payload;
      ctx.status = 200;
      ctx.append("X-Total-Count", result.payload.length.toString());
    } else {
      handleNotSuccessResult(result.error, ctx);
    }
  });

  router.get(
    `/admin/${appName}/participation/:id`,
    async (ctx: Koa.Context) => {
      const { id } = ctx.params;
      const result = await getParticipationById(id);
      if (result.ok) {
        if (result.payload) {
          ctx.body = result.payload;
          ctx.status = 200;
        } else {
          ctx.status = 404;
        }
      } else {
        handleNotSuccessResult(result.error, ctx);
      }
    },
  );
  return router;
};

export default init;
