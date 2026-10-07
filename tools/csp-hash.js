// Recomputes the sha256 hashes of the inline <script> and <style> in v2/index.html
// and writes them into its Content-Security-Policy meta tag.
// Run after every edit to the inline CSS or JS:  node tools/csp-hash.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const file = path.join(__dirname, "..", "v2", "index.html");
let html = fs.readFileSync(file, "utf8");

// Browsers normalise CRLF to LF before hashing, so hash the normalised text
const hash = (text) => "sha256-" + crypto.createHash("sha256").update(text.replace(/\r\n?/g, "\n"), "utf8").digest("base64");
const body = (re, label) => {
  const matches = [...html.matchAll(re)];
  if (matches.length !== 1) throw new Error(`Expected exactly one inline ${label}, found ${matches.length}`);
  return matches[0][1];
};

const scriptHash = hash(body(/<script>([\s\S]*?)<\/script>/g, "<script>"));
const styleHash = hash(body(/<style>([\s\S]*?)<\/style>/g, "<style>"));

html = html
  .replace(/script-src 'sha256-[^']*'/, `script-src '${scriptHash}'`)
  .replace(/style-src 'sha256-[^']*'/, `style-src '${styleHash}'`);

fs.writeFileSync(file, html);
console.log("script-src", scriptHash);
console.log("style-src ", styleHash);
