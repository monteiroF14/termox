const { getRandomValues } = await import('node:crypto');

const file = await Deno.readTextFile("wordlist.txt");
const words = file.split("\n");

function getRandomWord() {
        const randomValues = new Uint32Array(1);
        getRandomValues(randomValues);
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
                        const wordlistText = await Deno.readTextFile("wordlist.txt");
                        return new Response(wordlistText, {
                                headers: { "Content-Type": "text/plain" },
                        });
                } catch (err) {
                        console.error("File read error:", err);
                        return new Response("File not found", { status: 404 });
                }
        }

        let filePath = `public${url.pathname}`;
        if (url.pathname === "/") {
                filePath = "public/index.html";
        }

        try {
                const file = await Deno.readFile(filePath);
                return new Response(file);
        } catch (err) {
                console.error("File serve error:", err);
                return new Response("File not found", { status: 404 });
        }
}

Deno.serve({ port: 3000 }, handler);
console.log("Listening on port 3000...");

