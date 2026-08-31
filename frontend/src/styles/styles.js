/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 *
 * Helpers legados — delegam para constants/visualIdentity.js
 */

import {
  SIDEBAR_BG,
  TOPBAR_BG_LIGHT,
  BRAND_BLUE_DARK,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from "../constants/visualIdentity";

export const colorBack = () => SIDEBAR_BG;

export const colorPrimary = () => BRAND_BLUE_DARK;

export const colorIconesMenu = () => "#FFFFFF";

export const colorTitleTable = () => TEXT_SECONDARY;

export const colorTopTable = () => "#EDEDED";

export const colorBackgroundTable = () => SIDEBAR_BG;

export const colorLineTable = () => BRAND_BLUE_DARK;

export const colorLineTableHover = () => SIDEBAR_BG;

export const colorTopbar = () => TOPBAR_BG_LIGHT;

export const shadowSmall = () => {
  return "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
};

export const shadowMedium = () => {
  return "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
};

export const shadowLarge = () => {
  return "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
};

export const colorTextPrimary = () => TEXT_PRIMARY;
