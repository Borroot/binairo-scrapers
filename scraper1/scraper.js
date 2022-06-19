import * as cheerio from "cheerio";
import * as got from "got";
import * as fs from "fs";

async function fetch_puzzle(size, level, nr) {
  const options = `?size=${size}&level=${level}&nr=${nr}`;
  const url = "https://binarypuzzle.com/puzzles.php" + options;

  const response = await got.got(url, {
    retry: { limit: 1, statusCodes: [507, 508] },
    timeout: { request: 1000 },
  });
  return extract(await response.body);
}

function extract_variable(text, varname) {
  return [
    ...text.matchAll(
      new RegExp(`${varname}\\[(\\d+)\\]\\[(\\d+)\\] = '([01-])'`, "g")
    ),
  ]
    .map((line) => [line[1] * 1, line[2] * 1, line[3]])
    .sort((a, b) => {
      // a and b are of the form [y, x, value]
      if (a[0] === b[0]) {
        return a[1] - b[1];
      } else {
        return a[0] - b[0];
      }
    })
    .map((a) => a[2])
    .join("");
}

function extract(body) {
  const $ = cheerio.load(body);
  const script = $("script").html();

  const puzzle = extract_variable(script, "puzzel");
  const solution = extract_variable(script, "oplossing");

  return puzzle + " " + solution;
}

async function fetch_set(size, level, from = 1, to = 200) {
  // fetch all the puzzles of the given size and level [from:to] (to incl) asynchronously
  const numbers = [...Array(to - from + 1).keys()].map((x) => from + x);
  const promises = numbers.map((nr) => fetch_puzzle(size, level, nr));
  const codices = await Promise.allSettled(promises);

  // filter out all the puzzles which could not be retrieved
  const puzzles =
    codices
      .filter(({ status }) => status !== "rejected")
      .map(({ value }) => value)
      .join("\n") + "\n";
  return { size, level, puzzles };
}

async function fetch_sets() {
  const sizes = [6, 8, 10, 12, 14];
  const levels = [1, 2, 3, 4];

  // make a list with for all sizes all different levels
  const cross = []; // cross product
  sizes.forEach((size) => {
    levels.forEach((level) => cross.push({ size, level }));
  });

  const promises = cross.map((conf) =>
    fetch_set(conf.size, conf.level, 1, 200)
  );
  return (await Promise.allSettled(promises)).map(({ value: set }) => set);
}

async function write_sets() {
  for (const set of await fetch_sets())
    fs.appendFile(
      "./sets/size" + set.size + "level" + set.level + ".txt",
      set.puzzles,
      (_) => null
    );
}

// fetch_puzzle(14, 2, 5).then((text) => console.log(text));
// fetch_set(6, 2, 1, 5).then((puzzles) => console.log(puzzles));
// fetch_sets().then((puzzles) => console.log(puzzles));
write_sets();
