import {
  html,
  render,
  useState,
  useEffect,
  useLayoutEffect,
} from "../node_modules/htm/preact/standalone.module.js";
import { $state } from "./reactivity.js";

const generators = new WeakMap();

export function createIntegration(integrate) {
  let setupContext;
  function checkContext(name) {
    if (!setupContext) {
      throw new Error(`You can only call ${name} during setup!`);
    }
  }
  const INIT = Symbol("init");
  function effect(name, cb, getDeps = () => void 0) {
    checkContext(name);
    if (!setupContext[name]) {
      setupContext[name] = [];
    }
    setupContext[name].push({
      cb,
      getDeps,
      prevDeps: INIT,
    });
  }

  function runEffects(name, context) {
    if (context[name]) {
      context[name].forEach((effectData) => {
        const prevDeps = effectData.prevDeps;
        const deps = effectData.getDeps();
        let shouldRun = prevDeps === INIT || !deps;
        if (!shouldRun && deps && deps.length > 0) {
          if (
            !deps ||
            !prevDeps ||
            deps.length !== prevDeps.length ||
            deps.findIndex((d, i) => d !== prevDeps[i]) > -1
          ) {
            shouldRun = true;
          }
        }
        effectData.prevDeps = deps;
        if (shouldRun) {
          if (effectData.cleanUp) {
            effectData.cleanUp();
          }
          effectData.cleanUp = effectData.cb();
        }
      });
    }
  }

  return {
    createComponent: (generatorComponent) => {
      function renderComponent(context) {
        if (!context.renderPromise) {
          const next = generators.get(context).next();
          if (next instanceof Promise) {
            context.renderPromise = next.then((result) => {
              context.renderPromise = null;
              context.currentView = result.value;
              if (context.renderQeued) {
                context.renderQeued = false;
                context.stateChanged = true;
              }
              context.reRender();
            });
          } else {
            context.currentView = next.value;
          }
        }
      }
      function arePropsDifferent(oldProps, newProps) {
        const oldKeys = Object.keys(oldProps);
        const newKeys = Object.keys(newProps);
        if (oldKeys.length !== newKeys.length) {
          return true;
        }
        for (const key of oldKeys) {
          if (!newKeys.includes(key)) {
            return true;
          }
          if (oldProps[key] !== newProps[key]) {
            return true;
          }
        }
        return false;
      }
      return integrate({
        init: ({ reRender }, initialProps) => {
          const context = {
            state: $state({
              props: initialProps,
            }),
            reRender: () => {
              if (!context.renderPromise) {
                reRender();
              } else {
                context.renderQeued = true;
              }
            },
            currentView: null,
            allowStateReRender: true,
            stateChanged: true,
            init: true,
            renderPromise: null,
            renderQeued: false,
          };
          setupContext = context;
          generators.set(
            context,
            generatorComponent(context.state, () => {
              context.stateChanged = true;
              context.reRender();
            })
          );
          setupContext = undefined;
          context.state.on(() => {
            if (context.allowStateReRender) {
              context.stateChanged = true;
              context.reRender();
            }
          });
          return context;
        },
        render: (context, props) => {
          let propsChanged = false;
          if (props) {
            propsChanged = arePropsDifferent(props, context.state.props);
            context.allowStateReRender = false;
            context.state.props = props;
            context.allowStateReRender = true;
          }
          if (context.init) {
            setupContext = context;
          }
          if (context.stateChanged || propsChanged) {
            context.stateChanged = false;
            renderComponent(context);
          }
          if (context.init) {
            context.init = false;
            setupContext = undefined;
          }
          return context.currentView;
        },
        sideEffect: async (context) => {
          runEffects("sideEffect", context);
        },
        layoutEffect: async (context) => {
          runEffects("layoutEffect", context);
        },
      });
    },
    sideEffect: (cb, getDeps) => effect("sideEffect", cb, getDeps),
    layoutEffect: (cb, getDeps) => effect("layoutEffect", cb, getDeps),
  };
}

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
