import {
  html,
  render,
  useState,
} from "../node_modules/htm/preact/standalone.module.js";
import { $state } from "./reactivity.js";

const generators = new WeakMap();
export function createIntegration(integrate) {
  return (generatorComponent) => {
    function renderComponent(context) {
      if (!context.renderSuspended) {
        const next = generators.get(context).next();
        if (next instanceof Promise) {
          context.renderSuspended = true;
          next.then((result) => {
            context.currentView = result.value;
            context.renderSuspended = false;
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
          reRender,
          currentView: null,
          allowStateReRender: true,
          stateChanged: true,
          renderSuspended: false,
        };
        generators.set(
          context,
          generatorComponent(context.state, () => {
            context.stateChanged = true;
            reRender();
          })
        );
        context.off = context.state.on(() => {
          if (context.allowStateReRender) {
            context.stateChanged = true;
            reRender();
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
        if (context.stateChanged || propsChanged) {
          context.stateChanged = false;
          renderComponent(context);
        }
        return context.currentView;
      },
    });
  };
}

export const createPreactComponent = createIntegration((api) => {
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
    return api.render(context, props);
  };
});
