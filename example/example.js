import {
  html,
  render,
  useState,
} from "../node_modules/htm/preact/standalone.module.js";
import { createPreactComponent } from "../src/create_integration.js";

const Test = createPreactComponent(async function* (state, next) {
  state.inputValue = "";

  setTimeout(() => {
    next();
  });

  yield html`<div>loading...</div>`;
  await new Promise((resolve) => setTimeout(resolve, 2000));

  while (true) {
    yield html`
      <div>
        <div>count:${state.inputValue}</div>
        <div>
          <input
            onInput=${(e) => (state.inputValue = e.target.value)}
            type="text"
          />
        </div>
      </div>
    `;
  }
});

render(html`<${Test} />`, document.body);
