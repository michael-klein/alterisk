import htm from "./web_modules/htm.js";
export function normalizeHtmlResult(htmlResult) {
  if (Array.isArray(htmlResult)) {
    htmlResult = {
      children: htmlResult,
    };
  }
  return htmlResult;
}
function h(type, props, ...children) {
  return { type, props, children };
}

export const html = htm.bind(h);
