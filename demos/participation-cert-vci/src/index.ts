import * as dotenv from "dotenv";
import { init } from "./app.js";
import store from "./store.js";

dotenv.config();

await store.createDb();

const port = process.env.APP_PORT;

const app = init();
app.listen(port, () => {
  console.log(`running on port: ${port}`);
});
