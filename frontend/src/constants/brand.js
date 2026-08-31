import defaultBrandLogoLight from "../assets/logo-evoluti-crm-light.png";
import defaultBrandLogoDark from "../assets/logo-evoluti-crm-dark.png";
import defaultBrandLogoCollapsed from "../assets/logo evoluti reduzida.png";

export const APP_BRAND_NAME = "Evoluti CRM";

export const DEFAULT_BRAND_LOGO_LIGHT = defaultBrandLogoLight;
export const DEFAULT_BRAND_LOGO_DARK = defaultBrandLogoDark;
export const DEFAULT_BRAND_LOGO_COLLAPSED = defaultBrandLogoCollapsed;
export const DEFAULT_BRAND_FAVICON = defaultBrandLogoCollapsed;
/** @deprecated use DEFAULT_BRAND_LOGO_DARK */
export const DEFAULT_BRAND_LOGO = defaultBrandLogoDark;

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
