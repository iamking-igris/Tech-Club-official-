export function appEnvPlugin() {
  return {
    name: "app-env-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__app-env") {
          const payload = {
            VITE_AUTH_ENABLED: process.env.VITE_AUTH_ENABLED ?? "false",
            VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
            VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? "",
          };
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
          return;
        }
        next();
      });
    },
  };
}
