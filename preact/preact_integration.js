import { createPReactIntegration } from "../src/create_p_react_integration.js";
import * as Preact from "../web_modules/htm/preact/standalone.module.js";
export * from "../src/index.js";

export const {
  createComponent: createPreactComponent,
  $layoutEffect,
  $sideEffect,
  $onRender,
  $reRender,
} = createPReactIntegration(Preact);

export {
  html,
  render,
  useEffect,
  useLayoutEffect,
  useState,
  Component,
  createContext,
  h,
  useCallback,
  useContext,
  useDebugValue,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
} from "../web_modules/htm/preact/standalone.module.js";
