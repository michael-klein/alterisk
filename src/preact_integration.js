import * as Preact from "../web_modules/htm/preact/standalone.module.js";
export * from "../web_modules/htm/preact/standalone.module.js";
import { createPReactIntegration } from "./create_p_react_integration.js";

export const {
  createComponent: createPreactComponent,
  layoutEffect,
  sideEffect,
} = createPReactIntegration(Preact);
