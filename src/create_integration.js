import { $observable } from "./reactivity.js";

const generators = new WeakMap();

const WITH_PROMISE = Symbol("promise");
export function withPromise(view, promise) {
  return [WITH_PROMISE, view, promise];
}

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

  const api = {
    createComponent: (generatorComponent) => {
      function handleNext(context, next) {
        if (!next.done) {
          if (next.value instanceof Array && next.value[0] === WITH_PROMISE) {
            context.currentView = next.value[1];
            renderComponent(context, next.value[2]);
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
                context.observableChanged = true;
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
            allowObservableReRender: true,
            observableChanged: true,
            init: true,
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
            context.allowObservableReRender = false;
            context.params = { ...params };
            context.params.props = props;
            context.allowObservableReRender = true;
          } else {
            context.params = { ...params };
          }
          if (context.init) {
            setupContext = context;
          }
          if (context.observableChanged || propsChanged) {
            context.observableChanged = false;
            renderComponent(context);
          }
          if (context.init) {
            context.init = false;
            setupContext = undefined;
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
    $reRender: () => {
      checkContext("$reRender");
      const offs = [];
      api.$layoutEffect(
        () => () => {
          offs.forEach((off) => off());
        },
        () => []
      );
      const context = setupContext;
      const renderNow = () => {
        if (context.allowObservableReRender) {
          context.observableChanged = true;
          context.reRender();
        }
      };
      return {
        renderOn: (observable) => {
          const off = observable.on(renderNow);
          offs.push(off);
          return off;
        },
        renderNow,
      };
    },
  };
  return api;
}
