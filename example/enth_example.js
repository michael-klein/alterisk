import { createComponent, html, $layoutEffect } from "../enthjs/enth.js";
import { createObservable, withObservable } from "../src/index.js";

createComponent("test-component", function* (params) {
  const { attributes } = params();

  $layoutEffect(
    () => {
      const id = setInterval(() => {
        let count = Number(attributes.count ?? 0);
        count++;
        attributes.count = `${count}`;
      }, 1000);
      return () => clearInterval(id);
    },
    () => []
  );

  while (true) {
    const count = Number(attributes.count ?? 0);
    yield html`<div>count: ${count}</div>`;
  }
});
