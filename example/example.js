import { html, render } from "../node_modules/htm/preact/standalone.module.js";
import {
  createPreactComponent,
  layoutEffect,
} from "../src/create_integration.js";

const Test = createPreactComponent(async function* (state, next) {
  // fetch asap
  const initialValueResponse = new Promise((resolve) =>
    setTimeout(() => resolve("hello world"), 2000)
  );

  layoutEffect(
    () => next(), // will trigger next render and thus the promise below
    () => [] // only run after the first render
  );

  // we first show a loading spinner
  yield html`<div>loading...</div>`;

  // wait for initialValue before we continue
  const initialValue = await initialValueResponse;

  while (true) {
    const inputValue = state.inputValue ?? initialValue;
    yield html`
      <div>
        <div>value:${inputValue}</div>
        <div>
          <input
            value=${inputValue}
            onInput=${(e) => (state.inputValue = e.target.value)}
            type="text"
          />
        </div>
      </div>
    `;
  }
});

render(html`<${Test} />`, document.body);
