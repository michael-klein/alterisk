import {
  createPreactComponent,
  layoutEffect,
  html,
  render,
  withPromise,
} from "../preact/preact_integration.js";

import { Counter } from "./counter.js";

function fakeApiCall() {
  return new Promise((resolve) =>
    setTimeout(() => resolve("hello world"), 2000)
  );
}

// this is basically the new version of custom hooks
function setDocumentTitleTo(getValue) {
  // layoutEffect is similiar to useLayoutEffect in (p)react
  // you can only declare effects during the "setup phase" of the generator component
  // "setup phase" = the code before the first yield/await
  layoutEffect(
    () => {
      if (getValue()) {
        document.title = getValue();
      }
    },
    () => [getValue()]
  );
}

const Test = createPreactComponent(async function* (state) {
  // let's set the title of the page to our input value using an effect
  // just for fun!
  setDocumentTitleTo(() => state.inputValue);

  // we first show a loading spinner
  // then wait for initialValue before we continue
  // withPromise enables us to yield a view to render immediatly
  // and a promise. alter* will await the promise and re-render on resolve
  // yield returns the promise so we can await the result
  const initialValue = await (yield withPromise([
    html`<div>loading...</div>`,
    fakeApiCall(),
  ]));

  // here the component enters the normal loop afer fetching
  while (true) {
    const inputValue = state.inputValue ?? initialValue;
    yield html`
      <div>
        <div>value:${inputValue}</div>
        <${Counter} />
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
