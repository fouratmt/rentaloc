const withSecurityHeaders = (response) => {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

export default {
  async fetch(request, env) {
    let response = await env.ASSETS.fetch(request);

    if (response.status === 404 && request.headers.get("accept")?.includes("text/html")) {
      response = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    return withSecurityHeaders(response);
  },
};
