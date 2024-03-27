import { Command } from "@commander-js/extra-typings";

import { command } from "./keygen.js";

const program = new Command();

program
  .name("OID4VCI-demo-support functions")
  .description("CLI to support demo of OID4VCI")
  .version("0.0.1");

program.addCommand(command);

program.parse();
