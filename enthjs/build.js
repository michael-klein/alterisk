const fs = require("fs");
const Terser = require("terser");
const options = require("../terserrc.json");
const terserResult = Terser.minify(
  fs.readFileSync("./enth.js", "utf8").replace(/src/g, "dist"),
  {
    ...options,
  }
);
if (terserResult.error) {
  console.log(`Minifying index.js error.`, terserResult.error);
} else {
  fs.writeFileSync("./index.js", terserResult.code, "utf8");
}
