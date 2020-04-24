import { createPReactIntegration } from "../src/create_p_react_integration.js";
import * as Preact from "../web_modules/htm/preact/standalone.module.js";
export const {
  createComponent: createPreactComponent,
  layoutEffect,
  sideEffect,
} = createPReactIntegration(Preact);

export * from "../web_modules/htm/preact/standalone.module.js";
