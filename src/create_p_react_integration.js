import { createIntegration } from "./create_integration.js";

export const createPReactIntegration = (framework) =>
  createIntegration((api) => {
    const [init, render, sideEffect, layoutEffect, unmount] = api;
    return (props) => {
      const reRender = framework.useState(0)[1];
      const id = framework.useState(() => {
        return init(
          {
            reRender: () => reRender((i) => i + 1),
          },
          props
        );
      })[0];
      framework.useEffect(() => {
        sideEffect(id);
      });
      framework.useLayoutEffect(() => {
        layoutEffect(id);
      });
      framework.useEffect(
        () => () => {
          unmount(id);
        },
        []
      );
      return render(id, props);
    };
  });
