import {
  patch,
  text,
  elementOpen,
  elementClose,
  attributes,
  symbols,
  currentPointer,
  skipNode,
} from "./web_modules/incremental-dom.js";
import { normalizeHtmlResult } from "./html.js";

const defaultAttributeHandler = attributes[symbols.default];

attributes[symbols.default] = (element, name, value) => {
  if (name[0] === ".") {
    if (value) element[name.substr(1)] = value;
  } else {
    defaultAttributeHandler(element, name, value);
  }
};

function performRenderStep(htmlResult, parent = undefined) {
  if (htmlResult) {
    htmlResult = normalizeHtmlResult(htmlResult);
    let { type, children, props } = htmlResult;
    let pointer = currentPointer();

    while (pointer && pointer.hasAttribute("data-skip")) {
      skipNode();
      pointer = currentPointer();
    }
    if (type) {
      elementOpen(
        type,
        null,
        null,
        ...(props
          ? Object.keys(props).reduce((memo, propName) => {
              memo.push(propName, props[propName]);
              return memo;
            }, [])
          : [])
      );
    }
    children.forEach((child) => {
      if (!(child instanceof Object)) {
        if (child || Number(child) === child) text(child);
      } else if (typeof child === "function") {
        child();
      } else {
        performRenderStep(child, htmlResult);
      }
    });
    if (type) {
      elementClose(type);
    }
  }
}

const wasCleaned = new WeakSet();
function removeEmptyTextNodes(node) {
  if (!wasCleaned.has(node)) {
    wasCleaned.add(node);
    for (var n = 0; n < node.childNodes.length; n++) {
      var child = node.childNodes[n];
      if (child.nodeType === 3 && !/\S/.test(child.nodeValue)) {
        node.removeChild(child);
        n--;
      } else if (child.nodeType === 1) {
        removeEmptyTextNodes(child);
      }
    }
  }
}

export function render(htmlResult, node) {
  removeEmptyTextNodes(node);
  patch(node, function () {
    performRenderStep(htmlResult);
  });
}
