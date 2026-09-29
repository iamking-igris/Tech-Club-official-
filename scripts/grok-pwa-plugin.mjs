export function grokPwaPlugin() {
  return {
    name: "grok-pwa-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || "/";
        if (url === "/?install=1" || url === "/install") {
          const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Install</title></head><body style="font-family:sans-serif;padding:2rem"><h1>Tech Club Identity</h1><p>This app is ready for browser install. Open the app normally and add it to your home screen.</p></body></html>`;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(html);
          return;
        }
        next();
      });
    },
  };
}
