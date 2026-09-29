const mode = process.argv[2] || "status";
if (mode === "restart") {
  console.log("preview restart requested");
  process.exit(0);
}
if (mode === "stop") {
  console.log("preview stop requested");
  process.exit(0);
}
console.log(`preview command: ${mode}`);
