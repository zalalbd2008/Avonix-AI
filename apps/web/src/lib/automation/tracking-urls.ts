export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function trackingPixelUrl(token: string): string {
  return `${appBaseUrl()}/api/t/o/${token}`;
}

export function trackingClickUrl(token: string, destination: string): string {
  return `${appBaseUrl()}/api/t/c/${token}?u=${encodeURIComponent(destination)}`;
}
