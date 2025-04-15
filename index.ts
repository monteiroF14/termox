import { crypto } from "@std/crypto/crypto";
import * as path from "jsr:@std/path";

const wordlistPath = "/app/data/wordlist.txt";
const file = await Deno.readTextFile(wordlistPath);
const words = file.split("\n");

function getRandomWord() {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const randomIndex = randomValues[0] % words.length;
  return words[randomIndex];
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/status") {
    return new Response("OK");
  }

  if (url.pathname === "/word") {
    return new Response(getRandomWord());
  }

  if (url.pathname === "/wordlist") {
    try {
      const wordlistText = await Deno.readTextFile(wordlistPath);
      return new Response(wordlistText, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (err) {
      console.error("File read error:", err);
      return new Response("File not found", { status: 404 });
    }
  }

  if (url.pathname === "/add" && req.method === "POST") {
    try {
      const body = await req.text();

      if (!body.trim()) {
        return new Response("Empty request body", { status: 422 });
      }

      const newWords = body
        .split("\n")
        .map((word) => word.trim())
        .filter((word) => /^[a-zA-Z]{5}$/.test(word));

      if (newWords.length === 0) {
        return new Response("No valid words provided", { status: 400 });
      }

      const fileContent = await Deno.readTextFile(wordlistPath);
      const existingWords = new Set(
        fileContent.split("\n").map((w) => w.trim()),
      );

      const uniqueWords = newWords.filter((word) => !existingWords.has(word));

      if (uniqueWords.length === 0) {
        return new Response("All words already exist", { status: 409 });
      }

      await Deno.writeTextFile(wordlistPath, uniqueWords.join("\n") + "\n", {
        append: true,
      });

      return new Response("Words added successfully", { status: 201 });
    } catch (e) {
      return new Response(`Unknown error: ${e}`, { status: 400 });
    }
  }

  if (url.pathname === "/remove" && req.method === "POST") {
    try {
      const body = await req.text();
      const wordToRemove = body.trim();

      if (!/^[a-zA-Z]+$/.test(wordToRemove)) {
        return new Response("Invalid word. Must be 5 letters (a-z only).", {
          status: 400,
        });
      }

      const fileContent = await Deno.readTextFile(wordlistPath);
      const words = fileContent
        .split("\n")
        .map((w) => w.trim())
        .filter((w) => w && w.toLowerCase() !== wordToRemove.toLowerCase());

      await Deno.writeTextFile(wordlistPath, words.join("\n") + "\n");

      return new Response(`Word "${wordToRemove}" removed (if it existed)`, {
        status: 200,
      });
    } catch (e) {
      return new Response(`Unknown error: ${e}`, { status: 400 });
    }
  }

  let filePath = `public${url.pathname}`;
  if (url.pathname === "/") {
    filePath = "public/index.html";
  }

  try {
    const file = await Deno.readFile(filePath);
    const ext = path.extname(filePath);

    const contentType = {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    }[ext] || "application/octet-stream";

    return new Response(file, { headers: { "Content-Type": contentType } });
  } catch (err) {
    console.error("File serve error:", err);
    return new Response("File not found", { status: 404 });
  }
}

Deno.serve({ port: 3000 }, handler);
console.log("Listening on port 3000...");
