const WITH_MORE = Symbol("m");

function createYieldable(cb) {
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

function instanceOf(a, b) {
  return a instanceof b;
}

function isPromise(obj) {
  return instanceOf(obj, Promise);
}

function isArray(obj) {
  return instanceOf(obj, Array);
}

const RE_RENDER = 0;
const CURRENT_VIEW = 1;
const STATE_CHANGED = 2;
const RENDER_PROMISE = 3;
const RENDER_QUEUED = 4;
const PARAMS = 5;
const CURRENT_ARG = 6;
const ID = 7;
export function createIntegration(integrate) {
  const contextMap = {};
  const generators = {};

  let setupContext;
  const INIT = Symbol("init");
  function effect(name, cb, getDeps = () => void 0) {
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
    const context = contextMap[id];
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
    createComponent: (...args) => {
      const generatorComponent = args.pop();
      function handleNext(context, next) {
        if (!next.done) {
          if (isArray(next.value) && next.value[0] === WITH_MORE) {
            let [, view, arg, cb] = next.value;
            if (isPromise(arg)) {
              arg = arg.then((value) => {
                setupContext = context;
                return value;
              });
            }
            context[CURRENT_ARG] = arg;
            cb(arg, () => {
              if (isPromise(context[CURRENT_ARG])) {
                renderComponent(context);
              } else {
                context[STATE_CHANGED] = true;
                context[RE_RENDER]();
              }
            });
            context[CURRENT_VIEW] = view;
          } else {
            context[CURRENT_VIEW] = next.value;
          }
        }
      }
      function renderComponent(context) {
        if (!context[RENDER_PROMISE]) {
          const arg = context[CURRENT_ARG];
          context[CURRENT_ARG] = undefined;
          setupContext = context;
          const next = generators[context[ID]].next(arg);
          setupContext = undefined;
          if (isPromise(next)) {
            context[RENDER_PROMISE] = next.then((next) => {
              setupContext = undefined;
              context[RENDER_PROMISE] = null;
              handleNext(context, next);
              if (context[RENDER_QUEUED]) {
                context[RENDER_QUEUED] = false;
                context[STATE_CHANGED] = true;
              }
              context[RE_RENDER](true);
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
      return integrate(...args, [
        // init
        ({ reRender }, initialProps = {}, args = {}) => {
          const context = [];
          context[RE_RENDER] = (force = false) => {
            if (!context[RENDER_PROMISE] || force) {
              reRender();
            } else {
              context[RENDER_QUEUED] = true;
            }
          };
          context[CURRENT_VIEW] = null;
          context[STATE_CHANGED] = true;
          context[RENDER_PROMISE] = null;
          context[RENDER_QUEUED] = false;
          context[PARAMS] = {
            props: initialProps,
            ...args,
          };

          context[ID] = Symbol("id");
          contextMap[context[ID]] = context;
          setupContext = context;
          generators[context[ID]] = generatorComponent(() => context[PARAMS]);
          setupContext = undefined;
          return context[ID];
        },
        // render
        (id, props = {}, params = {}, propsChanged = false) => {
          const context = contextMap[id];
          if (props) {
            propsChanged =
              propsChanged || arePropsDifferent(props, context[PARAMS].props);
            context[PARAMS] = { ...params };
            context[PARAMS].props = props;
          } else {
            context[PARAMS] = { ...params };
          }
          if (context[STATE_CHANGED] || propsChanged) {
            context[STATE_CHANGED] = false;
            renderComponent(context);
          }
          runEffects(RENDER_EFFECT, id);
          return context[CURRENT_VIEW];
        },
        // sideEffect
        (id) => {
          runEffects(SIDE_EFFECT, id);
        },
        // layoutEffect
        (id) => {
          runEffects(LAYOUT_EFFECT, id);
        },
        // unmount
        (id) => {
          runEffects(SIDE_EFFECT, id, true);
          runEffects(LAYOUT_EFFECT, id, true);
          delete generators[id];
          delete contextMap[id];
        },
      ]);
    },
    $sideEffect: (cb, getDeps) => effect(SIDE_EFFECT, cb, getDeps),
    $layoutEffect: (cb, getDeps) => effect(LAYOUT_EFFECT, cb, getDeps),
    $onRender: (cb) =>
      effect(RENDER_EFFECT, () => {
        cb();
      }),
  };
}
