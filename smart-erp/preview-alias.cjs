// Loaded only by the development workflow. The normal npm start command and
// production server remain unchanged. Both listeners share this process.
const { createPreviewProxy } = require("./preview-proxy.cjs");
const targetPort = Number(process.env.PORT || 5000);
const proxy = createPreviewProxy(targetPort);
proxy.on("error", error => {
  console.error("Preview alias failed:", error.message);
  process.exit(1);
});
proxy.listen(3001, "0.0.0.0", () => {
  console.log(`Preview alias listening on port 3001 -> application port ${targetPort}`);
});
