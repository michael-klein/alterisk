import {
  createPreactComponent,
  layoutEffect,
  html,
  render,
  $state,
} from "../preact/preact_integration.js";

// $counter is a "custom hook" that creates a counter state and increments it every second
function $counter(params) {
  // a simple getter to get the initialCount passed through the props
  const getInitialCount = () => {
    const { props } = params();
    return props.initialCount ? props.initialCount : 0;
  };

  const counter = $state({ count: getInitialCount() });

  let id;
  layoutEffect(
    () => {
      counter.count = getInitialCount();
      // set up the interval
      id = setInterval(() => counter.count++, 1000);
      // clean it up on unmount
      return () => clearInterval(id);
    },
    () => [getInitialCount()] // run if count changed
  );
  return counter;
}

export const Counter = createPreactComponent(function* (state, params) {
  // we initialize a counter and merge the counter state into state
  // now, every time the interval ticks, it will trigger a re-render
  // the params functions contains an object with the current props (and potentially more)
  state.merge($counter(params));

  while (true) {
    const { count } = state;
    yield html` <div>current count: ${count}</div> `;
  }
});
