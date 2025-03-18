import "node:crypto"

const file = Bun.file("wordlist.txt")
const text = await file.text()

const words = text.split("\n")

function getRandomWord() {
        const randomValues = new Uint32Array(1);
        crypto.getRandomValues(randomValues);
        const randomIndex = randomValues[0] % words.length;
        return words[randomIndex]
}

Bun.serve({
        routes: {
                "/status": new Response("OK"),
                "/word": {
                        GET: () => new Response(getRandomWord())
                },
        },
        async fetch(req) {
                const url = new URL(req.url);
                let filePath = `public${url.pathname}`;

                try {
                        if (url.pathname === "/") {
                                filePath = "public/index.html";
                        }

                        if (url.pathname === "/wordlist") {
                                const wordlistFile = Bun.file("wordlist.txt");
                                if (await wordlistFile.exists()) {
                                        return new Response(await wordlistFile.text(), {
                                                headers: { "Content-Type": "text/plain" },
                                        });
                                }
                        }

                        const file = Bun.file(filePath);
                        if (await file.exists()) {
                                return new Response(file);
                        }
                } catch (err) {
                        console.error("File serve error:", err);
                }

                return new Response("File not found", { status: 404 });
        }
})

console.log("listening to port 3000..")
