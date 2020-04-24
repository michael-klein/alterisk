import { createIntegration } from "./create_integration.js";

export const createPReactIntegration = (framework) =>
  createIntegration((api) => {
    return (props) => {
      const reRender = framework.useState(0)[1];
      const context = framework.useState(
        api.init(
          {
            reRender: () => reRender((i) => i + 1),
          },
          props
        )
      )[0];
      framework.useEffect(() => {
        api.sideEffect(context);
      });
      framework.useLayoutEffect(() => {
        api.layoutEffect(context);
      });
      return api.render(context, props);
    };
  });
