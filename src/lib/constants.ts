export const ADMIN_SEGMENT = (() => {
  const segment = process.env.NEXT_PUBLIC_ADMIN_SEGMENT;
  if (!segment) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_ADMIN_SEGMENT");
  }
  return segment;
})();
