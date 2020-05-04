const isProxyMap = new WeakSet();
export function proxify(obj, onChange, hooks = {}) {
  let initialized = false;
  let onChangeWrapped = () => {
    if (initialized) {
      onChange();
    }
  };
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "object" && !isProxyMap.has(obj[key])) {
      obj[key] = proxify(obj[key], onChange);
    }
  });
  const proxy = new Proxy(obj, {
    get: (obj, prop) => {
      if (hooks.get) {
        hooks.get(obj, prop);
      }
      return obj[prop];
    },
    set: (obj, prop, value) => {
      const shouldFireChanged = obj[prop] !== value || !initialized;
      if (hooks.set) {
        value = hooks.set(obj, prop, value);
      }
      if (typeof value === "object" && !isProxyMap.has(value)) {
        value = proxify(value, onChangeWrapped);
      }
      if (shouldFireChanged) {
        obj[prop] = value;
        onChangeWrapped();
      } else {
        obj[prop] = value;
      }
      return true;
    },
  });
  isProxyMap.add(proxy);
  initialized = true;
  return proxy;
}

export const createObservable = (initialState, hooks = {}) => {
  let listeners = [];
  let canEmit = true;
  const proxy = proxify(
    {
      ...initialState,
      on: (listener) => {
        listeners.push(listener);
        return () => {
          const index = listeners.indexOf(listener);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        };
      },
      merge: (otherState) => {
        const performMerge = (value) => {
          Object.keys(value).forEach((key) => {
            if (!["on", "merge"].includes(key)) {
              proxy[key] = value[key];
            }
          });
        };
        otherState.on(() => {
          performMerge(otherState);
        });
        canEmit = false;
        performMerge(otherState);
        canEmit = true;
      },
    },
    () => {
      if (canEmit) {
        listeners.forEach((l) => l());
      }
    },
    hooks
  );
  return proxy;
};
const performMerge = (target, source) => {
  Object.keys(source).forEach((key) => {
    if (!["on", "merge"].includes(key)) {
      target[key] = source[key];
    }
  });
};
export function mergeObservables(...observables) {
  const mergedObservable = createObservable({});
  observables.forEach((observable) => {
    observable.on(() => {
      performMerge(mergedObservable, observable);
    });
    performMerge(mergedObservable, observable);
  });
  return mergedObservable;
}
