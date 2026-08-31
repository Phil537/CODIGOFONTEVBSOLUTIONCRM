import defaultBrandLogo from "../assets/logo-evoluti-crm.png";

export const APP_BRAND_NAME = "Evoluti CRM";

export const DEFAULT_BRAND_LOGO = defaultBrandLogo;

export function formatDocumentTitle(pageTitle) {
  const page =
    typeof pageTitle === "string" && pageTitle.trim() && pageTitle !== "[object Object]"
      ? pageTitle.trim()
      : "";

  if (page) {
    return `${APP_BRAND_NAME} | ${page}`;
  }

  return APP_BRAND_NAME;
}
