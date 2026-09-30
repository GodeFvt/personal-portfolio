export default defineEventHandler((event) => {
  const incoming = getHeader(event, "x-request-id");
  const requestId = incoming?.trim().slice(0, 128) || crypto.randomUUID();
  event.context.requestId = requestId;
  setHeader(event, "x-request-id", requestId);
});
