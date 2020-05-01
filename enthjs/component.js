import { createIntegration } from "../src/index.js";

export const {
  createComponent: createPreactComponent,
  $layoutEffect,
  $sideEffect,
  $onRender,
} = createIntegration((api) => {
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

export function createComponent(name, generatorComponent) {
  const {
    createComponent: createPreactComponent,
    $layoutEffect,
    $sideEffect,
    $onRender,
  } = createIntegration((api) => {
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

  createComponent(generatorComponent);
}
