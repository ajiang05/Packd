// Local verification receiver only. It never persists incoming payloads or attributes.
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
const report = {
  purpose:
    "Local OTLP HTTP/JSON trace emission check; not a production collector",
  batches: 0,
  packdService: false,
  domainSpans: 0,
  validTraceIds: 0,
};
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/report") {
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(report));
    return;
  }
  if (request.method !== "POST" || request.url !== "/v1/traces") {
    response.writeHead(404);
    response.end();
    return;
  }
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 4_000_000) {
      response.writeHead(413);
      response.end();
      return;
    }
  }
  try {
    const payload = JSON.parse(text);
    for (const resource of payload.resourceSpans ?? []) {
      if (
        resource.resource?.attributes?.some(
          (a) => a.key === "service.name" && a.value?.stringValue === "packd",
        )
      )
        report.packdService = true;
      for (const scope of resource.scopeSpans ?? [])
        for (const span of scope.spans ?? []) {
          if (span.name === "packd.domain") report.domainSpans++;
          if (/^[a-f0-9]{32}$/i.test(span.traceId ?? ""))
            report.validTraceIds++;
        }
    }
    report.batches++;
    await writeFile(
      "/tmp/otel-probe.json",
      JSON.stringify(
        { ...report, recordedAt: new Date().toISOString() },
        null,
        2,
      ),
    );
    response.setHeader("Content-Type", "application/json");
    response.end("{}");
  } catch {
    response.writeHead(400);
    response.end();
  }
}).listen(4318, "0.0.0.0", () => console.log("Local trace probe listening"));
