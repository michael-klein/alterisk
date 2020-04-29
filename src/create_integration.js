const generators = new WeakMap();

const WITH_MORE = Symbol("m");

export function createYieldable(cb) {
  return (view, arg) => {
    return [WITH_MORE, view, arg, cb];
  };
}

export const withPromise = createYieldable((_, render) => {
  render();
});

export const withObservable = createYieldable((observable, render) => {
  const off = observable.on(() => {
    off();
    render();
  });
});

export function createIntegration(integrate) {
  const contextMap = new Map();
  let setupContext;
  function checkContext(name) {
    if (!setupContext) {
      throw new Error(`You can only call ${name} during render!`);
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

  const RENDER_EFFECT = "r";
  const SIDE_EFFECT = "s";
  const LAYOUT_EFFECT = "l";

  function runEffects(name, id, onlyCleanup = false) {
    const context = contextMap.get(id);
    if (context[name]) {
      context[name].forEach((effectData) => {
        const prevDeps = effectData.prevDeps;
        const deps = effectData.getDeps();
        let shouldRun = prevDeps === INIT || !deps || onlyCleanup;
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
          if (!onlyCleanup) effectData.cleanUp = effectData.cb();
        }
      });
    }
  }

  return {
    createComponent: (generatorComponent) => {
      function handleNext(context, next) {
        if (!next.done) {
          if (next.value instanceof Array && next.value[0] === WITH_MORE) {
            let [, view, arg, cb] = next.value;
            if (arg instanceof Promise) {
              arg = arg.then((value) => {
                setupContext = context;
                return value;
              });
            }
            context.currentArg = arg;
            cb(arg, () => {
              if (context.currentArg instanceof Promise) {
                renderComponent(context);
              } else {
                context.stateChanged = true;
                context.reRender();
              }
            });
            context.currentView = view;
          } else {
            context.currentView = next.value;
          }
        }
      }
      function renderComponent(context) {
        if (!context.renderPromise) {
          const arg = context.currentArg;
          context.currentArg = undefined;
          setupContext = context;
          const next = generators.get(context).next(arg);
          setupContext = undefined;
          if (next instanceof Promise) {
            context.renderPromise = next.then((next) => {
              setupContext = undefined;
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
            setupContext = undefined;
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
        init: ({ reRender }, initialProps = {}, args = {}) => {
          const context = {
            reRender: (force = false) => {
              if (!context.renderPromise || force) {
                reRender();
              } else {
                context.renderQeued = true;
              }
            },
            currentView: null,
            stateChanged: true,
            renderPromise: null,
            renderQeued: false,
            params: {
              props: initialProps,
              ...args,
            },
          };
          const id = Symbol("id");
          contextMap.set(id, context);
          setupContext = context;
          generators.set(
            context,
            generatorComponent(() => context.params)
          );
          setupContext = undefined;
          return id;
        },
        render: (id, props = {}, params = {}) => {
          const context = contextMap.get(id);
          let propsChanged = false;
          if (props) {
            propsChanged = arePropsDifferent(props, context.params.props);
            context.params = { ...params };
            context.params.props = props;
          } else {
            context.params = { ...params };
          }
          if (context.stateChanged || propsChanged) {
            context.stateChanged = false;
            renderComponent(context);
          }
          runEffects(RENDER_EFFECT, id);
          return context.currentView;
        },
        sideEffect: (id) => {
          runEffects(SIDE_EFFECT, id);
        },
        layoutEffect: (id) => {
          runEffects(LAYOUT_EFFECT, id);
        },
        unmount: (id) => {
          runEffects(SIDE_EFFECT, id, true);
          runEffects(LAYOUT_EFFECT, id, true);
        },
      });
    },
    $sideEffect: (cb, getDeps) => effect(SIDE_EFFECT, cb, getDeps),
    $layoutEffect: (cb, getDeps) => effect(LAYOUT_EFFECT, cb, getDeps),
    $onRender: (cb) =>
      effect(RENDER_EFFECT, () => {
        cb();
      }),
  };
}
