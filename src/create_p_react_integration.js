import { createIntegration } from "./create_integration.js";

export const createPReactIntegration = (framework) =>
  createIntegration((api) => {
    return (props) => {
      const reRender = framework.useState(0)[1];
      const id = framework.useState(
        api.init(
          {
            reRender: () => reRender((i) => i + 1),
          },
          props
        )
      )[0];
      framework.useEffect(() => {
        api.sideEffect(id);
      });
      framework.useLayoutEffect(() => {
        api.layoutEffect(id);
      });
      return api.render(id, props);
    };
  });
