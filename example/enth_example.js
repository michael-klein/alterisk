import { createComponent, html, $layoutEffect } from "../enthjs/enth.js";
import { createObservable, withObservable } from "../src/index.js";

createComponent("test-component", function* () {
  const state = createObservable({ count: 0 });
  $layoutEffect(
    () => {
      const id = setInterval(() => {
        state.count++;
      }, 1000);
      return () => clearInterval(id);
    },
    () => []
  );

  while (true) {
    yield withObservable(html`<div>count: ${state.count}</div>`, state);
  }
});
