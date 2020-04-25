import {
  createPreactComponent,
  layoutEffect,
  html,
  render,
  $state,
} from "../preact/preact_integration.js";

// $counter is a "custom hook" that creates a counter state and increments it every second
function $counter() {
  const counter = $state({ count: 0 });
  layoutEffect(
    () => {
      // set up the interval
      const id = setInterval(() => counter.count++, 1000);
      // clean it up on unmount
      return () => clearInterval(id);
    },
    () => [] //run only once
  );
  return counter;
}

export const Counter = createPreactComponent(function* (state) {
  // we initialize a counter and merge the counter state into state
  // now, every time the interval ticks, it will trigger a re-render
  state.merge($counter());

  while (true) {
    const { count } = state;
    yield html` <div>current counter:${count}</div> `;
  }
});
