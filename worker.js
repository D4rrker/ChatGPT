import { WebWorkerMLCEngineHandler  } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.64/lib/index.min.js"

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (msg) => {
  handler.onmessage(msg);
}