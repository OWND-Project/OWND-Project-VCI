import Router from "koa-router";

import commonVciRoutes from "ownd-vci/dist/routes/vci/routes.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

import { tokenConfigure } from "../../logic/vciConfigProvider.js";
import { configure } from "../../logic/credentialsConfigProvider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename).split("/src")[0];

const init = () => {
  const router = new Router();
  commonVciRoutes.setupCommonRoute(
    router,
    tokenConfigure,
    configure,
    __dirname,
  );

  return router;
};

export default init;
