import { createIntegration } from "../../src/index.js";
import { createObservable } from "../../src/reactivity.js";
import { render } from "./web_modules/lit-html.js";

const observerMap = new WeakMap();

const addObserver = (element, onChange) => {
  if (!observerMap.has(element)) {
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "attributes") {
          onChange(
            mutation.attributeName,
            element.getAttribute(mutation.attributeName)
          );
        }
      }
    });
    observerMap.set(element, observer);
  }
};

const startObserving = (element) => {
  if (observerMap.has(element)) {
    observerMap.get(element).observe(element, { attributes: true });
  }
};

const stopObserving = (element) => {
  if (observerMap.has(element)) {
    observerMap.get(element).disconnect();
  }
};

function createPropertyProxy(element) {
  const accessedProps = [];
  const props = createObservable(
    {},
    {
      set: (obj, prop, value) => {
        if (obj[prop] !== value) {
          element[prop] = value;
        }
        return value;
      },
      get: (obj, prop) => {
        if (obj[prop] === undefined) {
          obj[prop] = element[prop] || undefined;
        }
        if (!accessedProps.includes(prop)) {
          accessedProps.push(prop);
          Object.defineProperty(element, prop, {
            get: () => obj[prop],
            set: (value) => {
              if (obj[prop] !== value) {
                obj[prop] = value;
              }
            },
          });
        }
        return obj[prop];
      },
    }
  );
  return props;
}

function createAttributeProxy(element) {
  const accessedAttributes = [];
  const attributes = createObservable(
    {},
    {
      set: (obj, prop, value) => {
        if (obj[prop] !== value) {
          element.setAttribute(prop, value);
        }
        return value;
      },
      get: (obj, prop) => {
        if (!obj[prop]) {
          obj[prop] = element.getAttribute(prop) || undefined;
        }
        if (!accessedAttributes.includes(prop)) {
          accessedAttributes.push(prop);
        }
        return obj[prop];
      },
    }
  );
  addObserver(element, (name, value) => {
    if (accessedAttributes.includes(name)) {
      attributes[name] = value;
    }
  });
  return attributes;
}

export const {
  createComponent,
  $layoutEffect,
  $sideEffect,
  $onRender,
} = createIntegration((name, api) => {
  const [init, apiRender, sideEffect, layoutEffect, unmount] = api;
  customElements.define(
    name,
    class extends HTMLElement {
      constructor() {
        super();
        let id;
        this.attachShadow({ mode: "open" });
        let renderQeueud = false;
        let nextQeueud = false;
        let propsChanged = false;
        const performRender = () => {
          renderComponent();
          layoutEffect(id);
          Promise.resolve().then(() => {
            sideEffect(id);
            renderQeueud = false;
            if (nextQeueud) {
              nextQeueud = false;
              queueRender();
            }
          });
        };
        const queueRender = () => {
          if (!renderQeueud) {
            renderQeueud = true;
            requestAnimationFrame(() => {
              performRender();
            });
          } else {
            nextQeueud = true;
          }
        };
        const props = createPropertyProxy(this, () => {
          propsChanged = true;
          queueRender();
        });
        const attributes = createAttributeProxy(this, () => {
          propsChanged = true;
          queueRender();
        });
        const renderComponent = () => {
          render(
            apiRender(id, props, { attributes }, propsChanged),
            this.shadowRoot
          );
          propsChanged = false;
        };
        id = init(
          {
            reRender: () => {
              queueRender();
            },
          },
          props,
          { attributes }
        );
        startObserving(this);
        performRender();
      }

      connectedCallback() {}

      disconnectedCallback() {
        unmount();
        stopObserving(this);
      }
    }
  );
});
