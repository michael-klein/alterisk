import * as Preact from "../node_modules/htm/preact/standalone.module.js";
export * from "../node_modules/htm/preact/standalone.module.js";
import { createPReactIntegration } from "./create_p_react_integration.js";

export const {
  createComponent: createPreactComponent,
  layoutEffect,
  sideEffect,
} = createPReactIntegration(Preact);
