import {
  createComponent,
  html,
  $layoutEffect,
  $sideEffect,
} from "../enthjs/src/enth.js";
import {
  createObservable,
  withObservables,
  mergeObservables,
} from "../src/index.js";

createComponent("test-component", function* (params) {
  const { attributes, props } = params();

  $layoutEffect(
    () => {
      const off1 = props.on(() => {
        if (props.count !== parseInt(attributes.count)) {
          attributes.count = `${props.count}`;
        }
      });
      const off2 = attributes.on(() => {
        if (props.count !== parseInt(attributes.count)) {
          props.count = attributes.count;
        }
      });

      const id = setInterval(() => {
        if (props.count === undefined) {
          props.count = 0;
        } else {
          props.count++;
        }
      }, 1000);
      return () => {
        clearInterval(id);
        off1();
        off2();
      };
    },
    () => []
  );

  while (true) {
    const count = props.count ?? 0;
    yield withObservables(html`<div>count: ${count}</div>`, attributes, props);
  }
});
