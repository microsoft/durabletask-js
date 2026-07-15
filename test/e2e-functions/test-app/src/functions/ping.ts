import { app, HttpHandler, HttpRequest, HttpResponse, InvocationContext } from "@azure/functions";

// Plain (non-durable) HTTP endpoint used by the e2e harness to detect when the
// Functions host has finished cold-starting and is ready to serve requests.
const ping: HttpHandler = async (_request: HttpRequest, _context: InvocationContext): Promise<HttpResponse> => {
    return new HttpResponse({ status: 200, body: "pong" });
};

app.http("ping", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "ping",
    handler: ping,
});
