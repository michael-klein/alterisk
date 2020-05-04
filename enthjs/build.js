const fs = require("fs");
const { sync: globSync } = require("glob");
const Terser = require("terser");
const options = require("../terserrc.json");
const { writeFileSyncRecursive } = require("../build_utils");

const files = globSync(`${"./src"}/**/*.js`);
files.map((file) => {
  const terserResult = Terser.minify(fs.readFileSync(file, "utf8"), {
    ...options,
  });
  if (terserResult.error) {
    console.log(`Minifying ${file} error.`, terserResult.error);
  } else {
    writeFileSyncRecursive(
      file.replace("src", "dist"),
      terserResult.code,
      "utf8"
    );
  }
});
