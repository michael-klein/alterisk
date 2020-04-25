import { $state } from "./reactivity.js";

const generators = new WeakMap();

export function createIntegration(integrate) {
  const contextMap = new Map();
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

  function runEffects(name, id) {
    const context = contextMap.get(id);
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
      function handleNext(context, next) {
        if (!next.done) {
          if (next.value instanceof Array) {
            context.currentView = next.value[0];
            renderComponent(context, next.value[1]);
          } else {
            context.currentView = next.value;
          }
        }
      }
      function renderComponent(context, arg = void 0) {
        if (!context.renderPromise) {
          const next = generators.get(context).next(arg);
          if (next instanceof Promise) {
            context.renderPromise = next.then((next) => {
              context.renderPromise = null;
              handleNext(context, next);
              if (context.renderQeued) {
                context.renderQeued = false;
                context.stateChanged = true;
              }
              context.reRender(true);
            });
          } else {
            handleNext(context, next);
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
            reRender: (force = false) => {
              if (!context.renderPromise || force) {
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
          const id = Symbol("id");
          contextMap.set(id, context);
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
          return id;
        },
        render: (id, props) => {
          const context = contextMap.get(id);
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
        sideEffect: async (id) => {
          runEffects("sideEffect", id);
        },
        layoutEffect: async (id) => {
          runEffects("layoutEffect", id);
        },
      });
    },
    sideEffect: (cb, getDeps) => effect("sideEffect", cb, getDeps),
    layoutEffect: (cb, getDeps) => effect("layoutEffect", cb, getDeps),
  };
}
