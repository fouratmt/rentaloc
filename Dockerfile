FROM nginx:1.30.4-alpine3.24@sha256:97d490c12ba55b4946b01546d1c3ed324e8d41ab1c9fcb2a616aa470620e5b46

ARG BUILD_REVISION=local

LABEL org.opencontainers.image.title="RentaLoc" \
  org.opencontainers.image.description="Client-only rental investment analysis PWA" \
  org.opencontainers.image.revision="${BUILD_REVISION}" \
  org.opencontainers.image.source="https://github.com/fouratmt/rentaloc"

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --chown=nginx:nginx index.html app.html site.webmanifest sw.js /usr/share/nginx/html/
COPY --chown=nginx:nginx src/ /usr/share/nginx/html/src/
COPY --chown=nginx:nginx assets/ /usr/share/nginx/html/assets/

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --output-document=/dev/null http://127.0.0.1:8080/app.html || exit 1

CMD ["nginx", "-g", "daemon off;"]
