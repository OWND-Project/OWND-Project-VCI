import { fileURLToPath } from "url";
import path, { dirname } from "path";

import Koa from "koa";
import serve from "koa-static";

import adminRoutes from "./routes/admin/routes.js";
import vciRoutes from "./routes/vci/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];
console.log("file:", __filename);
console.log("dir:", __dirname);

export const init = () => {
  const app = new Koa();
  const adminRouter = adminRoutes();
  const vciRouter = vciRoutes();

  app.use(serve(path.join(__dirname, "public")));

  app.use(adminRouter.routes()).use(adminRouter.allowedMethods());
  app.use(vciRouter.routes()).use(adminRouter.allowedMethods());
  app.use((ctx) => {
    // Handler to return bad request for all unhandled paths.
    ctx.response.status = 400;
  });
  return app;
};
