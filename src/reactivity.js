const isProxyMap = new WeakSet();
export function proxify(obj, onChange) {
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
      return obj[prop];
    },
    set: (obj, prop, value) => {
      if (typeof value === "object" && !isProxyMap.has(value)) {
        value = proxify(value, onChangeWrapped);
      }
      if (obj[prop] !== value || !initialized) {
        obj[prop] = value;
        onChangeWrapped();
      }
      obj[prop] = value;
      return true;
    },
  });
  isProxyMap.add(proxy);
  initialized = true;
  return proxy;
}

export const $observable = (initialState) => {
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
    }
  );
  return proxy;
};
