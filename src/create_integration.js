const WITH_MORE = Symbol("m");

function createYieldable(handler) {
  return (...args) => {
    function runHandler(reRender) {
      return handler(reRender, ...args);
    }
    runHandler[WITH_MORE] = true;
    return runHandler;
  };
}

export const withPromise = createYieldable((reRender, view, promise) => {
  promise.then((value) => {
    reRender(value);
  });
  return view;
});

export const withObservables = createYieldable(
  (reRender, view, ...observables) => {
    const offs = observables.map((observable, index) =>
      observable.on(() => {
        offs.forEach((off) => off());
        if (observables.length > 0) {
          reRender(index);
        } else {
          reRender();
        }
      })
    );
    return view;
  }
);

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
const PROPS_CHANGED = 1;
const STATE_CHANGED = 2;
const PARAMS = 3;
const ID = 4;
const CURRENT_ARG = 5;
const RENDER_LOOP = 6;

export function createIntegration(integrate) {
  const contextMap = {};

  let setupContext;

  function* createRenderLoop(context, viewGenerator, reRender) {
    let currentView;
    let isDone = false;
    while (true) {
      if (!isDone && (context[STATE_CHANGED] || context[PROPS_CHANGED])) {
        context[STATE_CHANGED] = false;
        context[PROPS_CHANGED] = false;
        const arg = context[CURRENT_ARG];
        context[CURRENT_ARG] = undefined;
        setupContext = context;
        let result = viewGenerator.next(arg);
        setupContext = undefined;

        if (isPromise(result)) {
          let promiseReady = false;
          while (!promiseReady) {
            result.then(function handleResult(value) {
              if (value instanceof Promise) {
                value.then(handleResult);
              } else {
                result = value;
                promiseReady = true;
                reRender();
              }
            });
            yield currentView;
          }
        }
        const { value, done } = result;
        if (value[WITH_MORE]) {
          let yieldableReady = false;
          let view;
          while (!yieldableReady) {
            if (!view) {
              view = value((nextArg) => {
                context[CURRENT_ARG] = nextArg;
                yieldableReady = true;
                reRender();
              });
            }
            currentView = view;
            yield currentView;
          }
          continue;
        }
        currentView = value;
        if (done) {
          isDone = true;
        }
      }
      yield currentView;
    }
  }

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

          context[RENDER_LOOP] = createRenderLoop(
            context,
            generatorComponent(() => context[PARAMS]),
            () => context[RE_RENDER](true)
          );

          context[RE_RENDER] = (force = false) => {
            if (force) {
              context[STATE_CHANGED] = true;
            }
            reRender();
          };

          context[STATE_CHANGED] = true;
          context[PROPS_CHANGED] = false;
          context[PARAMS] = {
            props: initialProps,
            ...args,
          };

          context[ID] = Symbol("id");
          contextMap[context[ID]] = context;
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
          context[PROPS_CHANGED] = propsChanged;
          runEffects(RENDER_EFFECT, id);
          return context[RENDER_LOOP].next().value;
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
