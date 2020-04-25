<h1 align="center">
  alter* (alterisk) <a href="https://www.npmjs.org/package/htm"><img src="https://img.shields.io/npm/v/alterisk.svg?style=flat" alt="npm"></a>
</h1>
<div align="center">
A generator driven component api for (p)react and more!
</div>
<br />
<br />

## What is this about?

alter* is an attempt to provide an (async) generator driven alternative component model for preact, react and more (you can create your own integration).

The idea to add this on top of existing ui frameworks was on the back of my mind for a while (ever since I started working on my own generator driven framework [enth.js](https://github.com/michael-klein)) and the general interest of the community in [Crank.js](https://crank.js.org/) finally made me give it a try.

This project is mostly experimental at this stage and I'm publishing it early to gather some feedback.

## Okay, but how does it look?

Here's a simple, contrived example of an async generator component on top of preact+htm:

[run on stackblitz](https://stackblitz.com/edit/js-8bjsqm)
```javascript
import {
  createPreactComponent,
  layoutEffect,
  html,
  render,
} from "https://cdn.jsdelivr.net/npm/alterisk@0.0.10/preact/index.js";

const Test = createPreactComponent(async function* (state) {
  // let's set the title of the page to our input value using an effect
  // just for fun!
  setDocumentTitleTo(() => state.inputValue);

  // we first show a loading spinner
  // wait for initialValue before we continue
  // the array allows us to return a view and a promise to wait for
  // when the promise resolves,  it will trigger the next render
  const initialValue = await (yield [
    html`<div>loading...</div>`,
    fakeApiCall(),
  ]);

  // here the component enters the normal loop afer fetching
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

render(html`<${Test} />`, document.body);
```
