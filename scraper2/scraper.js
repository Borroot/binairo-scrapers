const fetch = require("node-fetch");
const fs = require("fs");

const url = "https://www.puzzle-binairo.com/";
const options = {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
};

async function fetch_puzzle(set, puzzle) {
  const body = new URLSearchParams({ specific: 1, size: set, specid: puzzle });
  const response = await fetch(url, { ...options, body });
  return extract(await response.text());
}

function extract(text) {
  const match = text.match(/var task \= '(?<puzzle>[01\w]+)'/);
  return match.groups.puzzle;
}

async function fetch_set(set, from = 1, to = 1000) {
  if (from < 1 || to > 1000 || from >= to)
    throw new Error("Invalid from/to value passed.");

  // fetch all the puzzles in the set[from:to] asynchronously
  const puzzles = [...Array(to - from).keys()].map((x) => from + x);
  const promises = puzzles.map((puzzle) => fetch_puzzle(set, puzzle));
  const codices = await Promise.allSettled(promises);

  // filter out all the puzzles which could not be retrieved
  return codices
    .filter(({ status }) => status !== "rejected")
    .map(({ value: codex }) => codex);
}

async function fetch_sets() {
  const promises = [...Array(10).keys()].map((set) => fetch_set(set));
  return (await Promise.allSettled(promises)).map(({ value: set }) => set);
}

async function write_sets() {
  for (const [index, set] of (await fetch_sets()).entries())
    fs.writeFile("./sets/set" + index + ".txt", set.join("\n"), (_) => null);
}

write_sets();
// fetch_puzzle(0, 1).then((codex) => console.log(codex));
