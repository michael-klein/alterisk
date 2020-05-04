import {
  createPreactComponent,
  $layoutEffect,
  html,
  render,
  withPromise,
  createObservable,
  withObservables,
} from "../preact/src/preact_integration.js";

const Test = createPreactComponent(function* () {
  const greeting = yield withPromise(
    html`<div>...loading</div>`,
    new Promise((resolve) => setTimeout(() => resolve("hello world"), 2000))
  );
  yield html`<div>${greeting}</div>`;
});

render(html`<${Test} />`, document.body);
