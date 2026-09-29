export function getAvailability({ enabled, storeUrl } = {}) {
  try {
    const url = new URL(storeUrl);
    if (
      enabled === "true" &&
      url.protocol === "https:" &&
      url.hostname === "www.raycast.com" &&
      /^\/[^/]+\/[^/]+\/?$/.test(url.pathname)
    ) {
      return { label: "Available on Raycast", href: url.href, available: true };
    }
  } catch {
    /* Incomplete launch configuration keeps installation unavailable. */
  }
  return { label: "Coming to launch soon", href: "#pricing", available: false };
}
