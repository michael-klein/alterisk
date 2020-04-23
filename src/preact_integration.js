import {
  useState,
  useEffect,
  useLayoutEffect,
} from "../node_modules/htm/preact/standalone.module.js";
export * from "../node_modules/htm/preact/standalone.module.js";
import { createIntegration } from "./create_integration.js";

export const {
  createComponent: createPreactComponent,
  layoutEffect,
  sideEffect,
} = createIntegration((api) => {
  return (props) => {
    const reRender = useState(0)[1];
    const context = useState(
      api.init(
        {
          reRender: () => reRender((i) => i + 1),
        },
        props
      )
    )[0];
    useEffect(() => {
      api.sideEffect(context);
    });
    useLayoutEffect(() => {
      api.layoutEffect(context);
    });
    return api.render(context, props);
  };
});
