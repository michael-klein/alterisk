<h1 align="center">
  alter* (alterisk) <a href="https://www.npmjs.org/package/htm"><img src="https://img.shields.io/npm/v/alterisk.svg?style=flat" alt="npm"></a>
</h1>
<div align="center">
A generator driven component api for (p)react and more!
</div>
<br />
<br />

## What is this about?

alter\* is an attempt to provide an (async) generator driven alternative component model for preact, react and more (you can create your own integration).

The idea to add this on top of existing ui frameworks was on the back of my mind for a while (ever since I started working on my own generator driven framework [enth.js](https://github.com/michael-klein)) and the general interest of the community in [Crank.js](https://crank.js.org/) finally made me give it a try.

This project is mostly experimental at this stage and I'm publishing it early to gather some feedback.

## Okay, but how does it look?

The following is a simple, contrived example of an async generator component on top of preact+htm. As you can see, alter* lends itself for modelling multi step components that may even include async steps (no suspense needed):

[run on stackblitz](https://stackblitz.com/edit/fake-signup-form)
```javascript
import {
  createPreactComponent,
  render,
  html,
  h,
  createObservable,
  withObservable,
  withPromise,
  $layoutEffect
} from "alterisk/preact";
import { css } from "goober";
import { Card, Center, Form } from "./misc";

// this is an example work flow using alter* with a fake signup form
const Signup = createPreactComponent(async function*() {
  // an observable is a proxified objects that emits change events when any of it's (deep) properties changes
  // you could submit to these with formData.on(value => console.log(value))
  const formData = createObservable({
    email: "",
    password: "",
    avatar: false,
    step: 0 // identifies what step in the signup process we are in
    // step 0: enter email + password
    // step 1: upload avatar
    // step 3: we submit the form
  });

  // this is similiar to (p)reacts useLayoutEffect hook
  // it runs whenever the result of the second function returns a change in the dependency array
  // you may also return a cleanup function from the effect, just like in useLayoutEffect
  // careful: you only need to execture $layoutEffect once and not on every render, so don't put it inside the while loop below
  $layoutEffect(() => {
    document.title = `Step: ${formData.step}`
  },() => [formData.step])

  // while the user still needs to enter data, we remain in steps 0 and 1
  while (formData.step < 2) {
    switch (formData.step) {
      case 0:
        // withObservable renders the passed view and then waits for the passed observable to change to re-render
        yield withObservable(renderStep1(), formData);
        break;
      case 1:
        yield withObservable(renderStep2(), formData);
        break;
    }
  }
  // after step 1 is done, we break out of the loop and (fake) submit the form
  // withPromise triggers a re-render when the passed promise resolves
  // until then, we render a loading spinner
  const success = await (yield withPromise(
    renderLoadingSpinner(),
    submitSignUpForm()
  ));

  // handle the response
  if (success) {
    // successfully signed up, render a success message!
    yield html`
      <${Center}>
        <${Card}>
          (fake) sign-up successful!
        </${Card}>
      </${Center}>`;
  } else {
    // do something else (we're skipping this part)
  }

  function renderStep1() {
    const canSubmit = formData.email.length > 3 && formData.password.length > 3;
    return html`
        <${Center}>
          <${Card}>
            <div class="instructions">Please sign up here via our (fake) form:</div>
            <${Form} autocomplete="off">
              <input 
                type="text" 
                placeholder="email" 
                value=${formData.email} 
                oninput=${e => (formData.email = e.target.value)} />
              <input class="avatar" type="password" 
                placeholder="password" 
                value=${formData.password}   
                oninput=${e => (formData.password = e.target.value)} />
              <div class="submit">
                <button 
                  disabled=${!canSubmit} 
                  onclick=${e => formData.step++}>next: select an avatar
                </button>
              </div>
            </${Form}>
          </${Card}>
        </${Center}>`;
  }

  function renderStep2() {
    const canSubmit = formData.avatar;
    return html`
        <${Center}>
          <${Card}>
            <div class="instructions">Please upload an avatar picture:
              <div class=${css`
                font-size: 10px;
              `}>
                (we're not acctually uploading anything)
              </div>
            </div>
            <${Form} autocomplete="off">
            <input type="file" 
              name="avatar"
              accept="image/png, image/jpeg" 
              onchange=${e => (formData.avatar = true)}
              />
              <div class="submit">        
                <button 
                  class="previous"
                  onclick=${e => formData.step--}>back
                </button>
                <button 
                  disabled=${!canSubmit} 
                  onclick=${e => formData.step++}>submit
                </button>
              </div>
            </${Form}>
          </${Card}>
        </${Center}>`;
  }

  function renderLoadingSpinner() {
    return html`
        <${Center}>
          <${Card}>
            <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
          </${Card}>
        </${Center}>`;
  }

  function submitSignUpForm() {
    return new Promise(resolve => setTimeout(() => resolve(true), 2000))
  }
});

render(
  html`
    <${Signup} />
  `,
  document.body
);
```

## API

The API added on top of a framework by aster* is fairly simple. I will explain it using the provided preact integration.

### Observables

Observables are proxified objects. They include an ```on``` method for listening to changes. Any change on (deeply nested) properties of the object will fire the change event:

[run on stackblitz](https://stackblitz.com/edit/observables-example1)
```javascript
import { createObservable } from "alterisk/preact";

// create a new observable
const observable = createObservable({
  count: 0
});
// count observable up
setInterval(() => {
  observable.count++;
}, 1000);

// subscribe to the observable to update the DOM
const counter = document.getElementById("counter");
const off = observable.on(count => {
  counter.innerHTML = `current count: ${observable.count}`;
});

// unsubscribe on clicking the stop button
const stop = document.getElementById("stop");
stop.addEventListener("click", () => {
  off();
});
```

Additionally, all observables have a [merge] method with which you can merge one observable into another (so that the target has all properties of the the two observables and will fire onchange eventy when any of them change on either observable):

[run on stackblitz](https://stackblitz.com/edit/observables-example2)
```javascript
const observable1 = createObservable({
  count1: 0
});
const observable2 = createObservable({
  count2: 0
});
const merged = createObservable({});

merged.merge(observable1);
merged.merge(observable2);

setInterval(() => {
  observable1.count1++;
}, 1000);
setInterval(() => {
  observable2.count2+=10;
}, 3000);
const counter = document.getElementById("counter");
merged.on(() => {
  counter.innerHTML = `count1 + count2: ${merged.count1 + merged.count2}`;
});
```

### Rendering views and change detection

alter* components are generator functions that yield views:

```javascript
function* HelloWorld() {
  yield html`<div>hello world</div>`
}
```

A component may yield different results:
```javascript
function* HelloWorld() {
  yield html`<div>Hello world!</div>`
  yield html`<div>How are you?</div>`
}
```
Note: The above would only ever yield the second view if a re-render was triggered from the outside (by the parent component re-rendering).

In order to re-render based on observables changing (setting state), you can use the [withObservable] helper. It will immediatly yield the view passed as first argument and resume rendering whenever the passed observable is changed. 

[run on stackblitz](https://stackblitz.com/edit/withobservable-example)
```javascript
const ObservableExample = createPreactComponent(function* (){
  const observable = createObservable({askQuestion: false});
  setTimeout(() => {
    // yield the second view after 2 seconds:
    observable.false = true;
  },2000);
  yield withObservable(html`<div>Hello world!</div>`, observable);
  yield html`<div>How are you?</div>`  
});
```

### Async views

alter* adds first class support for async components and workflows:

[run on stackblitz](https://stackblitz.com/edit/async-component-example?file=index.js)
```javascript
const AsyncExample = createPreactComponent(async function* (){
  await new Promise(resolve => setTimeout(resolve,2000));
  yield html`<div>promise resolved</div>`  
});
```

The above component will only render after the promise resolved.

Obviously, you might want to show a loading indicator while a component is waiting. That's where the [withPromise] helper shines. Like [withObservable] it will immediatly render the passed view and return the promise so you can wait it!

[run on stackblitz](https://stackblitz.com/edit/withpromise-example?file=index.js)
```javascript
const WithPromiseExample = createPreactComponent(async function*() {
  function fetchCurrentDate() {
    return new Promise(resolve =>
      setTimeout(() => resolve(new Date().toDateString()), 2000)
    );
  }

  const date = await (yield withPromise(
    html`
      <div>...loading current date</div>
    `,
    fetchCurrentDate()
  ));
  
  yield html`
    <div>current date: ${date}</div>
  `;
});
```

### Creating integrations

[createIntegration] is the main API method for adding generator based component factories on top of a given framework. Here's how you would arrive at [createPreactComponent] using it:

```javascript
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
  const [init, render, sideEffect, layoutEffect, unmount] = api;
  return (props) => {
    const reRender = useState(0)[1];
    const id = useState(() => {
      // api.init should be called during initialization of a new component instance
      // it will return an id, which is a Symbol meant to identify the new instance
      return init(
        {
          // return a function that triggers a re-render for alterisk to use
          reRender: () => reRender((i) => i + 1),
        },
        props
      );
    })[0];

    // api.sideEffect (asyncronous) and api.layoutEffect (syncronours) should be called after each render
    useEffect(() => {
      sideEffect(id);
    });
    useLayoutEffect(() => {
      layoutEffect(id);
    });

    // call unmount on component unmount for cleanup purposes
    useEffect(
      () => () => {
        unmount(id);
      },
      []
    );

    return render(id, props); // call this for every re-render and pass props
  };
});
```

## What's next?

Neither the current implementation nor the API are stable so I'd like some feedback via github issues :)
Some things that are planned:

- Typescript types (the library itself is written as es6 modules but I will provide a .d.ts file eventually)
- A ready-to-use web component integration
- Tests!
