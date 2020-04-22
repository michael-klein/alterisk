import {
  html,
  render,
  useState,
} from "../node_modules/htm/preact/standalone.module.js";
import { $state } from "./reactivity.js";

const generators = new WeakMap();
export function createIntegration(integrate) {
  return (generatorComponent) => {
    return integrate({
      init: ({ reRender }) => {
        const context = {
          state: $state({}),
          reRender,
        };
        generators.set(context, generatorComponent(context.state));
        context.state.on(reRender);
        return context;
      },
      render: (context) => {
        return generators.get(context).next().value;
      },
    });
  };
}

export const createPreactComponent = createIntegration((api) => {
  return (props) => {
    const reRender = useState(0)[1];
    const context = useState(
      api.init({
        reRender: () => reRender((i) => i + 1),
      })
    )[0];
    return api.render(context);
  };
});
