import Koa from "koa";

import getLogger from "../logging.js";

const logger = getLogger();

const routesLogger = () => {
  return async (ctx: Koa.ParameterizedContext, next: Koa.Next) => {
    const path = ctx.request.path;
    logger.info(`${path} %s`, "start");
    await next();
    logger.info(`${path} %s`, "end");
  };
};

export default routesLogger;
