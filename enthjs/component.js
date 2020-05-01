import { createIntegration } from "../src/index.js";
import { render } from "./render.js";

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
        const renderComponent = () => {
          render(apiRender(id), this.shadowRoot);
        };
        id = init({
          reRender: () => {
            queueRender();
          },
        });
        performRender();
      }

      connectedCallback() {}

      disconnectedCallback() {
        unmount();
      }
    }
  );
});
