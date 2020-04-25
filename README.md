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

// our component is defined by a generator that yield views
// state is a proxified object, any change to it's (deep) properties will trigger a re-render
// state.props contains the current props
const Test = createPreactComponent(async function*(state) { 
  // here begins the "setup phase"
  // "setup phase" = the code before the first yield/await

  // In the setup phase, you should call alter*'s equivalent to custom hooks (implementation below):
  setDocumentTitleTo(() => state.inputValue);

  // we first show a loading spinner
  // wait for initialValue before we continue
  // the array allows us to return a view and a promise to wait for
  // when the promise resolves,  it will trigger the next render
  const initialValue = await (yield [
    html`
      <div>loading...</div>
    `,
    fakeApiCall()
  ]);

  // here the component enters the normal loop afer fetching
  while (true) {
    const inputValue = state.inputValue !== undefined ? state.inputValue : initialValue;
    yield html`
      <div>
        <div>value:${inputValue}</div>
        <div>
          <input
            value=${inputValue}
            onInput=${e => (state.inputValue = e.target.value)}
            type="text"
          />
        </div>
      </div>
    `;
  }
});

// this is basically the new version of custom hooks
function setDocumentTitleTo(getValue) {
  // let's set the title of the page to our input value using an effect
  // just for fun!
  // layoutEffect is similiar to useLayoutEffect in (p)react
  // you can only declare effects during the "setup phase" of the generator component

  layoutEffect(
    () => {
      if (getValue()) {
        document.title = getValue();
      }
    },
    () => [getValue()]
  );
}

render(
  html`
    <${Test} />
  `,
  document.body
);

function fakeApiCall() {
  return new Promise(resolve => setTimeout(() => resolve("hello world"), 2000));
}
```

## Create integrations

alterisk can integrate with any framework (potentially). From the above example, [createPreactComponent] was created with the createPReactIntegration factory function which in turn is a thin wrapper around [createIntegration].

[createIntegration] is the main API method for adding generator based component factories on top of a given framework. Here's how you would arrive at [createPreactComponent] using it:

```
import { createIntegration } from "alterisk";
import { useState, useEffect, useLayoutEffect } from "htm/preact";

export const {
  createComponent: createPreactComponent,
  layoutEffect,
  sideEffect,
} = createIntegration((api) => {
  // createIntegration expects you to return a valid component definition for the given framework
  // in this case, it's a function component
  // it might also be a class component
  return (props) => {
    const reRender = useState(0)[1];
    const id = useState(() => {
      // api.init should be called during initialization of a new component instance
      // it will return an id, which is a Symbol meant to identify the new instance
      return api.init(
        {
          // return a function that triggers a re-render for alterisk to use
          reRender: () => reRender((i) => i + 1),
        },
        props
      );
    })[0];

    // api.sideEffect (asyncronous) and api.layoutEffect (syncronours) should be called after each render
    useEffect(() => {
      api.sideEffect(id);
    });
    useLayoutEffect(() => {
      api.layoutEffect(id);
    });

    // call unmount on component unmount for cleanup purposes
    useEffect(
      () => () => {
        api.unmount(id);
      },
      []
    );

    return api.render(id, props); // call this for every re-render and pass props
  };
});
```
