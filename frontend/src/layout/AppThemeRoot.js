/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useMemo, useContext, useRef } from "react";
import ReactDOM from "react-dom";
import api from "../services/api";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { ptBR } from "@material-ui/core/locale";
import {
  createTheme,
  ThemeProvider,
  useTheme,
} from "@material-ui/core/styles";
import {
  ThemeProvider as MuiV5ThemeProvider,
  createTheme as createMuiV5Theme,
} from "@mui/material/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./themeContext";
import { ActiveMenuProvider } from "../context/ActiveMenuContext";
import { PageTitleProvider } from "../context/PageTitleContext";
import Favicon from "react-favicon";
import { getBackendUrl, resolvePublicUploadUrl } from "../config";
import { AuthContext } from "../context/Auth/AuthContext";
import {
  APP_BRAND_NAME,
  DEFAULT_BRAND_LOGO_LIGHT,
  DEFAULT_BRAND_LOGO_DARK,
  DEFAULT_BRAND_FAVICON,
} from "../constants/brand";
import {
  SIDEBAR_BG,
  BRAND_BLUE,
  BRAND_BLUE_DARK,
  BRAND_BLUE_MEDIUM,
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TAG_BG,
  TAG_TEXT,
} from "../constants/visualIdentity";

const defaultLogoLight = DEFAULT_BRAND_LOGO_LIGHT;
const defaultLogoDark = DEFAULT_BRAND_LOGO_DARK;
const defaultLogoFavicon = DEFAULT_BRAND_FAVICON;
import useSettings from "../hooks/useSettings";
import {
  getContrastTextForBackground,
  getSidebarContrast,
  logosLookSameUrl,
  isDarkBackgroundHex,
} from "../utils/colorContrast";

import "../styles/animations.css";
import { PREMIUM_FONT_FAMILY } from "../constants/typography";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

const queryClient = new QueryClient();

/**
 * Componentes @mui/material leem o tema do ThemeProvider v5.
 * Sem esta ponte, `sx` e tokens como `text.secondary` caem no tema padrão (visual “cru”).
 */
const MuiV5ThemeBridge = ({ children }) => {
  const t = useTheme();
  const v5Theme = useMemo(() => {
    const p = t.palette;
    return createMuiV5Theme({
      palette: {
        mode: p.type === "dark" ? "dark" : "light",
        primary: { ...p.primary },
        secondary: { ...p.secondary },
        error: { ...p.error },
        background: { ...p.background },
        text: { ...p.text },
        divider: p.divider,
      },
      typography: t.typography,
      shape: t.shape,
    });
  }, [t]);
  return (
    <MuiV5ThemeProvider theme={v5Theme}>{children}</MuiV5ThemeProvider>
  );
};

const isValidHex = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(color);
};

/** Fundos neutros (sem tom marrom); primária continua vinda do whitelabel */
const LIGHT_BG_DEFAULT = "#f5f5f5";
const LIGHT_BG_PAPER = "#ffffff";
/** Faixa de filtros / chrome interno (modo claro) — branco */
const LIGHT_CHROME_SURFACE = "#ffffff";
/** Modo escuro: sem preto puro, tudo cinzas escuros (mais escuros, mais nítidos) */
const DARK_BG_DEFAULT = "#2d2d2d";
const DARK_BG_PAPER = "#3a3a3a";
const DARK_BG_ELEVATED = "#454545";
/** Cards de KPI / quadros no escuro: cinza escuro nítido */
const DARK_DASHBOARD_CARD = "#48484b";
/** Menu lateral padrão: azul-marinho bem escuro */
const LIGHT_SIDEBAR_DEFAULT = SIDEBAR_BG;
/** Topbar padrão: igual ao menu lateral */
const LIGHT_TOPBAR_DEFAULT = LIGHT_SIDEBAR_DEFAULT;
/** Marca / links / destaques */
const BRAND_PRIMARY_DEFAULT = BRAND_BLUE;
/** Botão principal (Enviar, FAB +) */
const BUTTON_PRIMARY_DEFAULT = BUTTON_PRIMARY;

/** Topbar padrão modo escuro: igual ao sidebar escuro */
const DARK_TOPBAR_DEFAULT = DARK_BG_DEFAULT;

/** Valores legados de topbar (antes do alinhamento com o sidebar) */
const LEGACY_TOPBAR_LIGHT = new Set(["#FFFFFF", "#FFF"]);
const LEGACY_TOPBAR_DARK = new Set(["#1E3A8A", BRAND_BLUE_DARK.toUpperCase()]);

const resolveTopbarHex = (custom, sidebarEff, legacySet) => {
  if (!custom || !isValidHex(custom)) return sidebarEff;
  const normalized = custom.trim().toUpperCase();
  if (legacySet.has(normalized)) return sidebarEff;
  return custom;
};

const AppThemeRoot = ({ children }) => {
  const { user, isAuth } = useContext(AuthContext);
  const [locale, setLocale] = useState();
  
  const getSafeColor = (color) => {
    if (color && isValidHex(color)) return color;
    return BRAND_PRIMARY_DEFAULT;
  };

  const appColorLocalStorage = getSafeColor(
    localStorage.getItem("primaryColorLight") ||
    localStorage.getItem("primaryColorDark")
  );
  const btnLightStored = localStorage.getItem("buttonPrimaryColorLight");
  const btnDarkStored = localStorage.getItem("buttonPrimaryColorDark");
  const btnSecLightStored = localStorage.getItem("buttonSecondaryColorLight");
  const btnSecDarkStored = localStorage.getItem("buttonSecondaryColorDark");
  const appNameLocalStorage = localStorage.getItem("appName") || "";
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const preferredTheme = window.localStorage.getItem("preferredTheme");
  const [mode, setMode] = useState(
    preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light"
  );
  const [primaryColorLight, setPrimaryColorLight] =
    useState(appColorLocalStorage);
  const [primaryColorDark, setPrimaryColorDark] =
    useState(appColorLocalStorage);
  const [buttonPrimaryColorLight, setButtonPrimaryColorLight] = useState(
    btnLightStored && isValidHex(btnLightStored) ? btnLightStored : ""
  );
  const [buttonPrimaryColorDark, setButtonPrimaryColorDark] = useState(
    btnDarkStored && isValidHex(btnDarkStored) ? btnDarkStored : ""
  );
  const btnTextLightStored = localStorage.getItem("buttonPrimaryTextColorLight");
  const btnTextDarkStored = localStorage.getItem("buttonPrimaryTextColorDark");
  const [buttonPrimaryTextColorLight, setButtonPrimaryTextColorLight] = useState(
    btnTextLightStored && isValidHex(btnTextLightStored) ? btnTextLightStored : ""
  );
  const [buttonPrimaryTextColorDark, setButtonPrimaryTextColorDark] = useState(
    btnTextDarkStored && isValidHex(btnTextDarkStored) ? btnTextDarkStored : ""
  );
  const [buttonSecondaryColorLight, setButtonSecondaryColorLight] = useState(
    btnSecLightStored && isValidHex(btnSecLightStored) ? btnSecLightStored : ""
  );
  const [buttonSecondaryColorDark, setButtonSecondaryColorDark] = useState(
    btnSecDarkStored && isValidHex(btnSecDarkStored) ? btnSecDarkStored : ""
  );
  const [topbarColorLight, setTopbarColorLight] = useState(
    () => localStorage.getItem("topbarColorLight") || ""
  );
  const [topbarColorDark, setTopbarColorDark] = useState(
    () => localStorage.getItem("topbarColorDark") || ""
  );
  const [sidebarColorLight, setSidebarColorLight] = useState(
    () => localStorage.getItem("sidebarColorLight") || ""
  );
  const [sidebarColorDark, setSidebarColorDark] = useState(
    () => localStorage.getItem("sidebarColorDark") || ""
  );
  const [appLogoLight, setAppLogoLight] = useState(defaultLogoLight);
  const [appLogoDark, setAppLogoDark] = useState(defaultLogoDark);
  const [appLogoFavicon, setAppLogoFavicon] = useState(defaultLogoFavicon);
  const [appLogoTickets, setAppLogoTickets] = useState(DEFAULT_BRAND_LOGO_DARK);
  const [appName, setAppName] = useState(appNameLocalStorage);
  const { getPublicSetting } = useSettings();
  const getPublicSettingRef = useRef(getPublicSetting);
  getPublicSettingRef.current = getPublicSetting;

  const colorModeActions = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          window.localStorage.setItem("preferredTheme", newMode);
          return newMode;
        });
      },
      setPrimaryColorLight,
      setPrimaryColorDark,
      setButtonPrimaryColorLight,
      setButtonPrimaryColorDark,
      setButtonPrimaryTextColorLight,
      setButtonPrimaryTextColorDark,
      setButtonSecondaryColorLight,
      setButtonSecondaryColorDark,
      setTopbarColorLight,
      setTopbarColorDark,
      setSidebarColorLight,
      setSidebarColorDark,
      setAppLogoLight,
      setAppLogoDark,
      setAppLogoFavicon,
      setAppLogoTickets,
      setAppName,
    }),
    []
  );

  const colorModeDataRef = useRef({
    appLogoLight, appLogoDark, appLogoFavicon, appLogoTickets, appName, mode,
  });
  colorModeDataRef.current = {
    appLogoLight, appLogoDark, appLogoFavicon, appLogoTickets, appName, mode,
  };

  const colorMode = useMemo(
    () => ({
      ...colorModeActions,
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appLogoTickets,
      appName,
      mode,
    }),
    [colorModeActions, appLogoLight, appLogoDark, appLogoFavicon, appLogoTickets, appName, mode]
  );

  const theme = useMemo(() => {
    const brandLight = getSafeColor(primaryColorLight);
    const brandDark = getSafeColor(primaryColorDark);

    /** Sidebar: whitelabel ou azul-marinho (claro) / cinza escuro (escuro) */
    const sidebarLightEff =
      sidebarColorLight && isValidHex(sidebarColorLight)
        ? getSafeColor(sidebarColorLight)
        : LIGHT_SIDEBAR_DEFAULT;
    const sidebarDarkEff =
      sidebarColorDark && isValidHex(sidebarColorDark)
        ? getSafeColor(sidebarColorDark)
        : DARK_BG_DEFAULT;

    /** Topbar: whitelabel ou igual ao sidebar DEFAULT (ignora sidebar salvo p/ evitar branco) */
    let topbarLightEff = resolveTopbarHex(
      topbarColorLight,
      LIGHT_SIDEBAR_DEFAULT,
      LEGACY_TOPBAR_LIGHT
    );
    let topbarDarkEff = resolveTopbarHex(
      topbarColorDark,
      DARK_BG_DEFAULT,
      LEGACY_TOPBAR_DARK
    );

    /** Sidebar SEMPRE com a mesma cor da topbar (todo o menu fica com a cor da topbar) */
    const sidebarLightEffFinal = topbarLightEff;
    const sidebarDarkEffFinal = topbarDarkEff;
    topbarLightEff = sidebarLightEffFinal;
    topbarDarkEff = sidebarDarkEffFinal;

    /** Primária do sistema (links, abas, foco) — independente da topbar branca */
    const systemPrimaryLight = brandLight;
    const systemPrimaryDark =
      primaryColorDark && isValidHex(primaryColorDark)
        ? getSafeColor(primaryColorDark)
        : DARK_TOPBAR_DEFAULT;

    const topbarIsLight =
      mode === "light" && !isDarkBackgroundHex(topbarLightEff);

    const navbarAccentLight = getContrastTextForBackground(topbarLightEff);
    const navbarAccentDark = getContrastTextForBackground(topbarDarkEff);
    const navbarAccent =
      mode === "light" ? navbarAccentLight : navbarAccentDark;

    /** Abas e destaques de página: azul marca fixo no claro (sempre legível no fundo branco). */
    const pageTabsAccent = mode === "light" ? BRAND_BLUE_DARK : "#ffffff";
    const currentSidebarBg =
      mode === "light" ? sidebarLightEffFinal : sidebarDarkEffFinal;
    const sidebarCx = getSidebarContrast(currentSidebarBg);

    const primaryButtonBgLight =
      buttonPrimaryColorLight && isValidHex(buttonPrimaryColorLight)
        ? buttonPrimaryColorLight
        : BUTTON_PRIMARY_DEFAULT;
    const primaryButtonBgDark =
      buttonPrimaryColorDark && isValidHex(buttonPrimaryColorDark)
        ? buttonPrimaryColorDark
        : BRAND_BLUE_DARK;

    const primaryButtonTextLight =
      buttonPrimaryTextColorLight && isValidHex(buttonPrimaryTextColorLight)
        ? buttonPrimaryTextColorLight
        : getContrastTextForBackground(primaryButtonBgLight);
    const primaryButtonTextDark =
      buttonPrimaryTextColorDark && isValidHex(buttonPrimaryTextColorDark)
        ? buttonPrimaryTextColorDark
        : getContrastTextForBackground(primaryButtonBgDark);

    return createTheme(
        {
          // Scrollbar styles melhorados mas usando cores do tema
          scrollbarStyles: {
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
              backgroundColor:
                mode === "light" ? systemPrimaryLight : systemPrimaryDark,
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor:
                mode === "light" ? LIGHT_BG_DEFAULT : DARK_BG_ELEVATED,
              borderRadius: "4px",
            },
          },

          scrollbarStylesSoft: {
            scrollbarWidth: "thin",
            scrollbarColor: `${mode === "light" ? "#BDBDBD" : "#888888"} ${mode === "light" ? "transparent" : "rgba(255,255,255,0.04)"}`,
            "&::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: mode === "light" ? "#E0E0E0" : "rgba(255,255,255,0.4)",
              borderRadius: "3px",
              "&:hover": {
                backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a",
              }
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
            },
          },

          palette: {
            type: mode,
            background:
              mode === "light"
                ? { default: LIGHT_BG_DEFAULT, paper: LIGHT_BG_PAPER }
                : { default: DARK_BG_DEFAULT, paper: DARK_BG_PAPER },
            text:
              mode === "light"
                ? {
                    primary: TEXT_PRIMARY,
                    secondary: TEXT_SECONDARY,
                    disabled: "rgba(0, 0, 0, 0.38)",
                  }
                : {
                    primary: "#ffffff",
                    secondary: "#e5e5e5",
                    disabled: "rgba(255, 255, 255, 0.38)",
                  },
            divider:
              mode === "light" ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.08)",
            primary: {
              main: mode === "light" ? systemPrimaryLight : systemPrimaryDark,
              light: mode === "light"
                ? `${systemPrimaryLight}80`
                : `${systemPrimaryDark}80`,
              dark: mode === "light"
                ? `${systemPrimaryLight}CC`
                : `${systemPrimaryDark}CC`,
              contrastText: "#ffffff",
            },
            secondary: {
              main: mode === "light" ? BUTTON_SECONDARY : "#94a3b8",
              contrastText: "#ffffff",
            },
            error: {
              main: mode === "light" ? "#c45c5c" : "#e08a8a",
              contrastText: "#ffffff",
            },
            textPrimary:
              mode === "light" ? systemPrimaryLight : "#ffffff",
            borderPrimary:
              mode === "light" ? systemPrimaryLight : "rgba(255, 255, 255, 0.35)",
            dark: { main: mode === "light" ? "#333333" : "#F3F3F3" },
            light: { main: mode === "light" ? "#F3F3F3" : "#333333" },
            fontColor: mode === "light" ? systemPrimaryLight : "#ffffff",
            tabHeaderBackground:
              mode === "light" ? "#EEE" : DARK_BG_DEFAULT,
            optionsBackground:
              mode === "light" ? "#fafafa" : DARK_BG_PAPER,
            fancyBackground:
              mode === "light" ? "#fafafa" : DARK_BG_DEFAULT,
            total: mode === "light" ? "#fff" : DARK_BG_DEFAULT,
            messageIcons: mode === "light" ? "grey" : "#F3F3F3",
            inputBackground:
              mode === "light" ? "#FFFFFF" : DARK_BG_ELEVATED,
            barraSuperior:
              mode === "light" ? topbarLightEff : topbarDarkEff,
            sidebarMenuBackground:
              mode === "light" ? sidebarLightEffFinal : sidebarDarkEffFinal,
            /** Menu lateral: textos sempre legíveis; ícones seguem botões. */
            sidebarMenuTextPrimary: sidebarCx.isDark
              ? sidebarCx.textPrimary
              : mode === "light"
                ? "rgba(0, 0, 0, 0.87)"
                : "rgba(255, 255, 255, 0.92)",
            sidebarMenuTextSecondary: sidebarCx.isDark
              ? sidebarCx.textSecondary
              : mode === "light"
                ? "rgba(0, 0, 0, 0.55)"
                : "rgba(255, 255, 255, 0.65)",
            sidebarMenuIcon: sidebarCx.isDark
              ? sidebarCx.icon
              : mode === "light"
                ? systemPrimaryLight
                : systemPrimaryDark,
            sidebarMenuItemHoverBg: sidebarCx.hoverBg,
            sidebarMenuItemActiveBg: sidebarCx.activeBg,
            sidebarMenuActiveText: sidebarCx.activeText,
            sidebarMenuActiveIcon: sidebarCx.activeIcon,
            sidebarMenuHoverAccent:
              sidebarCx.isDark
                ? "#ffffff"
                : mode === "light"
                  ? systemPrimaryLight
                  : systemPrimaryDark,
            /** Menu lateral com fundo escuro (cor custom) → logo branca */
            sidebarMenuIsDarkLogo: sidebarCx.isDark,
            /** Navbar secundária, faixa de filtros e cabeçalho Activities — alinhado ao menu lateral no escuro */
            chromeSurface:
              mode === "light" ? LIGHT_CHROME_SURFACE : DARK_BG_DEFAULT,
            /** Área dos dashboards no escuro: preto; cards usam dashboardCard */
            dashboardCanvas:
              mode === "light" ? LIGHT_BG_DEFAULT : DARK_BG_PAPER,
            dashboardCard:
              mode === "light" ? LIGHT_BG_PAPER : DARK_DASHBOARD_CARD,
            /** Listagens em tela cheia: no escuro = cinza shell (#1e1e1e), não paper preto */
            listScrollArea:
              mode === "light" ? LIGHT_BG_PAPER : DARK_BG_DEFAULT,
          },

          typography: {
            fontFamily: PREMIUM_FONT_FAMILY,
            fontWeightLight: 300,
            fontWeightRegular: 400,
            fontWeightMedium: 500,
            fontSize: 13,
            body1: {
              fontWeight: 400,
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
            },
            body2: {
              fontWeight: 400,
              fontSize: "0.75rem",
              lineHeight: 1.45,
            },
            h1: {
              fontWeight: 600,
              fontSize: "1.75rem",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            },
            h2: {
              fontWeight: 600,
              fontSize: "1.375rem",
              letterSpacing: "-0.025em",
              lineHeight: 1.25,
            },
            h3: {
              fontWeight: 600,
              fontSize: "1.125rem",
              letterSpacing: "-0.02em",
            },
            h4: {
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "-0.02em",
            },
            h5: {
              fontWeight: 600,
              fontSize: "0.9375rem",
              letterSpacing: "-0.02em",
            },
            h6: {
              fontWeight: 600,
              fontSize: "0.875rem",
              letterSpacing: "-0.015em",
            },
            button: {
              fontWeight: 500,
              fontSize: "0.8125rem",
              textTransform: "none",
              letterSpacing: "-0.01em",
            },
            caption: {
              fontSize: "0.6875rem",
              letterSpacing: "0.02em",
            },
            subtitle1: {
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            },
            subtitle2: {
              fontSize: "0.8125rem",
              fontWeight: 500,
            },
          },

          shape: {
            borderRadius: 8,
          },
          overrides: {
            MuiCssBaseline: {
              "@global": {
                body: {
                  backgroundColor:
                    mode === "light" ? LIGHT_BG_DEFAULT : DARK_BG_DEFAULT,
                  color:
                    mode === "light"
                      ? TEXT_PRIMARY
                      : "#ffffff",
                  overflowX: "hidden",
                  overflowY: "hidden",
                  fontFamily: PREMIUM_FONT_FAMILY,
                  fontWeight: 400,
                },
                // Labels e bordas em Modais (Drawer/Dialog) — sempre contrastantes
                ".MuiDrawer-paper .MuiFormLabel-root, .MuiDialog-paper .MuiFormLabel-root, .MuiDrawer-paper .MuiInputLabel-root, .MuiDialog-paper .MuiInputLabel-root": {
                  color: mode === "light" ? TEXT_PRIMARY : "#e4e4e7",
                  fontWeight: 500,
                  textTransform: "none",
                  fontSize: "13px"
                },
                ".MuiDrawer-paper .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline, .MuiDialog-paper .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light" ? "#d1d5db" : "rgba(255, 255, 255, 0.12)",
                  borderWidth: "1px"
                },
                ".MuiDrawer-paper .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline, .MuiDialog-paper .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light" ? `${systemPrimaryLight}aa` : "rgba(255, 255, 255, 0.28)",
                  borderWidth: "1px",
                  boxShadow: "none"
                },
                ".MuiDrawer-paper .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline, .MuiDialog-paper .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light" ? "#9ca3af" : "rgba(255, 255, 255, 0.18)"
                },
                ".MuiDrawer-paper .MuiSelect-root, .MuiDialog-paper .MuiSelect-root, .MuiDrawer-paper .MuiInputBase-input, .MuiDialog-paper .MuiInputBase-input": {
                  color: mode === "light" ? TEXT_PRIMARY : "#f4f4f5"
                },
                ".MuiDrawer-paper .MuiInputBase-input::placeholder, .MuiDialog-paper .MuiInputBase-input::placeholder": {
                  color: mode === "light" ? "#6b7280" : "rgba(255, 255, 255, 0.5)",
                  opacity: 1,
                },
                ".MuiDrawer-paper, .MuiDialog-paper": {
                  color: mode === "light" ? TEXT_PRIMARY : "#ffffff",
                },
                ".MuiDrawer-paper .MuiTypography-root, .MuiDialog-paper .MuiTypography-root": {
                  color: mode === "light" ? TEXT_PRIMARY : "#ffffff",
                },
                ".MuiDrawer-paper .MuiButton-text, .MuiDialog-paper .MuiButton-text": {
                  color: mode === "light" ? BRAND_BLUE_DARK : "#93c5fd",
                },
                ".MuiDrawer-paper .MuiFormHelperText-root, .MuiDialog-paper .MuiFormHelperText-root": {
                  color: mode === "light" ? TEXT_SECONDARY : "rgba(255, 255, 255, 0.65)"
                },
                ".MuiDrawer-root > .MuiBackdrop-root": {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(3px)',
                },
                ".MuiDialog-root > .MuiBackdrop-root": {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(3px)',
                },
                ".MuiDrawer-paper *, .MuiDialog-paper *, .MuiPopover-paper *": {
                  scrollbarWidth: "thin",
                  scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                },
                ".MuiDrawer-paper *::-webkit-scrollbar, .MuiDialog-paper *::-webkit-scrollbar, .MuiPopover-paper *::-webkit-scrollbar": {
                  width: 6,
                  height: 6,
                },
                ".MuiDrawer-paper *::-webkit-scrollbar-thumb, .MuiDialog-paper *::-webkit-scrollbar-thumb, .MuiPopover-paper *::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                },
                ".MuiDrawer-paper *::-webkit-scrollbar-thumb:hover, .MuiDialog-paper *::-webkit-scrollbar-thumb:hover, .MuiPopover-paper *::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a",
                },
                ".MuiDrawer-paper *::-webkit-scrollbar-track, .MuiDialog-paper *::-webkit-scrollbar-track, .MuiPopover-paper *::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
                ...(mode === "dark"
                  ? {
                      "input:not([type='checkbox']):not([type='radio']), textarea, select": {
                        color: "#f4f4f5",
                      },
                      "input::placeholder, textarea::placeholder": {
                        color: "rgba(255, 255, 255, 0.5)",
                        opacity: 1,
                      },
                    }
                  : {}),
              },
            },
            // Botões usando cor do tema
            MuiButton: {
              root: {
                borderRadius: 6,
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.8125rem",
                minHeight: 32,
                padding: "6px 12px",
                letterSpacing: "-0.01em",
                transition:
                  "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
                boxShadow: "none",
              },
              contained: {
                boxShadow: "none",
                backgroundColor: mode === "dark" ? "#6b7280" : undefined,
                color: mode === "dark" ? "#ffffff" : undefined,
                "&:hover": {
                  boxShadow: "none",
                  backgroundColor: mode === "dark" ? "#4b5563" : undefined,
                },
              },
              containedPrimary: {
                backgroundColor:
                  mode === "light" ? primaryButtonBgLight : primaryButtonBgDark,
                color:
                  mode === "light" ? primaryButtonTextLight : primaryButtonTextDark,
                "&:hover": {
                  boxShadow: "none",
                  filter: "brightness(0.96)",
                },
              },
              outlined: {
                borderWidth: 1,
              },
              sizeSmall: {
                minHeight: 28,
                fontSize: "0.75rem",
                padding: "4px 10px",
              },
              outlinedPrimary: {
                color: mode === "dark" ? "#ffffff" : undefined,
                borderColor:
                  mode === "dark" ? "rgba(255, 255, 255, 0.35)" : undefined,
                "&:hover": {
                  borderColor:
                    mode === "dark" ? "rgba(255, 255, 255, 0.55)" : undefined,
                  backgroundColor:
                    mode === "dark" ? "rgba(255, 255, 255, 0.06)" : undefined,
                },
              },
              textPrimary: {
                color: mode === "dark" ? "#ffffff" : undefined,
              },
              outlinedSecondary: {
                color: mode === "light" ? BUTTON_SECONDARY : "#94a3b8",
                borderColor:
                  mode === "light" ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.5)",
                "&:hover": {
                  backgroundColor:
                    mode === "light" ? "rgba(100, 116, 139, 0.06)" : "rgba(148, 163, 184, 0.1)",
                  borderColor:
                    mode === "light" ? BUTTON_SECONDARY : "#94a3b8",
                },
              },
              textSecondary: {
                color: mode === "light" ? BUTTON_SECONDARY : "#94a3b8",
              },
            },
          
            // ✅ VOLTAR: Papers com largura total
            MuiPaper: {
              root: {
                backgroundImage: "none",
                marginLeft: 0,
                marginRight: 0,
                width: "100%",
              },
              rounded: {
                borderRadius: 10,
              },
              elevation1: {
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              },
              elevation2: {
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
              },
              elevation3: {
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
              },
            },
            MuiCard: {
              root: {
                borderRadius: 10,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                border:
                  mode === "light"
                    ? "1px solid rgba(15, 23, 42, 0.06)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
              },
            },

            // ⭐ ADICIONAR: Proteção específica para menus
            MuiMenu: {
              paper: {
                width: 'auto !important',
                maxWidth: '300px !important',
                minWidth: '180px !important',
                backgroundColor: mode === "dark" ? DARK_BG_PAPER : LIGHT_BG_PAPER,
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
                border: mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.08)",
                scrollbarWidth: "thin",
                scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                "&::-webkit-scrollbar": { width: 6, height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
              }
            },

            MuiPopover: {
              paper: {
                width: 'auto !important',
                maxWidth: '300px !important',
                minWidth: 'auto !important',
                backgroundColor: mode === "dark" ? DARK_BG_PAPER : LIGHT_BG_PAPER,
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
                border: mode === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.08)",
                scrollbarWidth: "thin",
                scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                "&::-webkit-scrollbar": { width: 6, height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
              }
            },

            MuiMenuItem: {
              root: {
                color: mode === "light" ? TEXT_PRIMARY : "#f4f4f5",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: mode === "light" ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.06)",
                },
                "&.Mui-selected": {
                  backgroundColor: mode === "light" ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.25)",
                  color: mode === "light" ? TEXT_PRIMARY : "#ffffff",
                  "&:hover": {
                    backgroundColor: mode === "light" ? "rgba(59,130,246,0.16)" : "rgba(59,130,246,0.3)",
                  },
                },
              },
            },
            MuiInputLabel: {
              root: {
                color: mode === "light" ? "#374151" : "rgba(255, 255, 255, 0.78)",
                fontWeight: 500,
                "&.Mui-focused": {
                  color: mode === "light" ? BRAND_BLUE_DARK : "rgba(255, 255, 255, 0.95)",
                },
              },
            },
            MuiFormLabel: {
              root: {
                color: mode === "light" ? "#374151" : "rgba(255, 255, 255, 0.78)",
                fontWeight: 500,
              },
            },

            // Inputs melhorados
            MuiOutlinedInput: {
              root: {
                borderRadius: 6,
                fontSize: "0.8125rem",
                color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                backgroundColor: mode === "dark" ? "rgba(255,255,255,0.02)" : "#ffffff",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light" ? "#d1d5db" : "rgba(255, 255, 255, 0.14)",
                  borderWidth: 1,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light"
                      ? `${systemPrimaryLight}cc`
                      : "rgba(255, 255, 255, 0.32)",
                  borderWidth: 1,
                  boxShadow: "none",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor:
                    mode === "light" ? "#9ca3af" : "rgba(255, 255, 255, 0.22)",
                },
                "& input": {
                  color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                },
                "& input::placeholder": {
                  color: mode === "light" ? "#6b7280" : "rgba(255,255,255,0.5)",
                  opacity: 1,
                },
                "& textarea": {
                  color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                },
                outline: "none",
              },
            },
            MuiTextField: {
              root: {
                color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 8,
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: mode === "light" ? "#9ca3af" : "rgba(255,255,255,0.22)",
                    }
                  },
                  '&.Mui-focused': {
                    outline: 'none',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        mode === "light" ? `${systemPrimaryLight}cc` : "rgba(255, 255, 255, 0.32)",
                      borderWidth: 1,
                      boxShadow: 'none',
                    }
                  },
                  '& input': {
                    color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                  },
                  '& input::placeholder': {
                    color: mode === "light" ? "#6b7280" : "rgba(255,255,255,0.5)",
                    opacity: 1,
                  }
                }
              }
            },

            // Tabs usando cor do tema
            MuiTab: {
              root: {
                textTransform: 'none',
                fontWeight: 300,
                letterSpacing: '0.01em',
                borderRadius: '8px 8px 0 0',
                transition: 'background-color 0.2s ease',
                '&:hover': {
                  backgroundColor: mode === "light"
                    ? `${systemPrimaryLight}14`
                    : `${systemPrimaryDark}22`,
                },
                '&.Mui-selected': {
                  color: mode === "light" ? systemPrimaryLight : "#ffffff",
                  fontWeight: 300,
                }
              }
            },

            MuiBackdrop: {
              root: {
                '&:not(.MuiBackdrop-invisible)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(3px)',
                  WebkitBackdropFilter: 'blur(3px)',
                },
              },
            },

            // Drawer sem bordas — fundos e textos SEMPRE com contraste explícito
            MuiDrawer: {
              paper: {
                border: 'none',
                backgroundColor:
                  mode === "light" ? LIGHT_BG_PAPER : DARK_BG_PAPER,
                color: mode === "light" ? TEXT_PRIMARY : "#ffffff",
                scrollbarWidth: "thin",
                scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                "&::-webkit-scrollbar": { width: 6, height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a" },
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
                "& *": {
                  scrollbarWidth: "thin",
                  scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                },
                "& *::-webkit-scrollbar": { width: 6, height: 6 },
                "& *::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a" },
                },
                "& *::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
              }
            },

            // AppBar transparente
            MuiAppBar: {
              root: {
                boxShadow: 'none',
              }
            },
            MuiDialog: {
              paper: {
                borderRadius: 10,
                boxShadow:
                  mode === "light"
                    ? "0 8px 30px rgba(15, 23, 42, 0.1)"
                    : "0 8px 30px rgba(0, 0, 0, 0.35)",
                border:
                  mode === "light"
                    ? "1px solid rgba(15, 23, 42, 0.08)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                backgroundColor: mode === "dark" ? DARK_BG_PAPER : LIGHT_BG_PAPER,
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
                scrollbarWidth: "thin",
                scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                "&::-webkit-scrollbar": { width: 6, height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a" },
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
                "& *": {
                  scrollbarWidth: "thin",
                  scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                },
                "& *::-webkit-scrollbar": { width: 6, height: 6 },
                "& *::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a" },
                },
                "& *::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
              },
            },
            MuiDialogTitle: {
              root: {
                fontWeight: 600,
                fontSize: "0.9375rem",
                padding: "16px 20px 8px",
                letterSpacing: "-0.02em",
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
                fontFamily: PREMIUM_FONT_FAMILY,
              },
            },
            MuiDialogContent: {
              root: {
                padding: "8px 20px 16px",
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
                fontFamily: PREMIUM_FONT_FAMILY,
                scrollbarWidth: "thin",
                scrollbarColor: mode === "light" ? "#BDBDBD transparent" : "rgba(255,255,255,0.4) rgba(255,255,255,0.04)",
                "&::-webkit-scrollbar": { width: 6, height: 6 },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: mode === "light" ? "#d1d5db" : "rgba(255,255,255,0.4)",
                  borderRadius: 3,
                  "&:hover": { backgroundColor: mode === "light" ? "#BDBDBD" : "#8a8a8a" },
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: mode === "light" ? "transparent" : "rgba(255,255,255,0.04)",
                },
              },
            },
            MuiDialogActions: {
              root: {
                padding: "12px 16px",
                gap: 8,
              },
            },
            MuiTypography: {
              root: {
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
              },
              colorTextSecondary: {
                color: mode === "dark" ? "#e5e5e5" : TEXT_SECONDARY,
              },
            },
            MuiListItemText: {
              primary: {
                color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
              },
              secondary: {
                color: mode === "dark" ? "rgba(255, 255, 255, 0.72)" : TEXT_SECONDARY,
              },
            },
            MuiLink: {
              root: {
                color: mode === "dark" ? "#93c5fd" : BRAND_BLUE,
              },
            },
            MuiStepLabel: {
              label: {
                color: mode === "dark" ? "rgba(255, 255, 255, 0.7)" : TEXT_SECONDARY,
              },
              active: {
                color: mode === "dark" ? "#ffffff" : TEXT_PRIMARY,
              },
              completed: {
                color: mode === "dark" ? "rgba(255, 255, 255, 0.85)" : TEXT_PRIMARY,
              },
            },
            MuiTableCell: {
              root: {
                fontSize: "0.8125rem",
                padding: "8px 12px",
                color: mode === "dark" ? "#f4f4f5" : TEXT_PRIMARY,
                borderBottomColor:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(15, 23, 42, 0.08)",
              },
              head: {
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.7)"
                    : "#374151",
                borderBottomColor:
                  mode === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(15, 23, 42, 0.1)",
                padding: "10px 12px",
                backgroundColor:
                  mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f9fafb",
              },
            },
            MuiTableRow: {
              root: {
                "&:hover": {
                  backgroundColor:
                    mode === "light"
                      ? "rgba(15, 23, 42, 0.02)"
                      : "rgba(255, 255, 255, 0.04)",
                },
              },
            },
            MuiTableContainer: {
              root: {
                borderRadius: 8,
                border:
                  mode === "light"
                    ? "1px solid rgba(15, 23, 42, 0.06)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
              },
            },
            MuiIconButton: {
              root: {
                padding: 6,
                borderRadius: 6,
                transition: "background-color 0.15s ease",
              },
            },
            MuiFab: {
              root: {
                borderRadius: "50%",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.14)",
                width: 52,
                height: 52,
              },
              primary: {
                backgroundColor:
                  mode === "light" ? primaryButtonBgLight : primaryButtonBgDark,
                color:
                  mode === "light" ? primaryButtonTextLight : primaryButtonTextDark,
                "&:hover": {
                  filter: "brightness(0.96)",
                },
              },
            },
          },

          mode,
          topbarIsLight,
          /** Ícones da topbar do sistema: contraste com a cor da topbar. */
          navbarAccent,
          /** Cor de destaque em abas (ActivitiesStyleLayout) — alinhada à primária / top bar. */
          pageTabsAccent,
          appLogoLight,
          appLogoDark,
          appLogoFavicon,
          appLogoTickets,
          appName,
          /**
           * Logo para fundo escuro (sidebar/tema escuro): appLogoDark ou PNG branca padrão.
           * Se claro e escuro apontam para o mesmo arquivo, não reutilizar — usa o bundle branco.
           */
          calculatedLogoDark: () =>
            logosLookSameUrl(appLogoDark, appLogoLight)
              ? defaultLogoDark
              : appLogoDark,
          /** Logo para fundo claro: só appLogoLight ou default preta */
          calculatedLogoLight: () => appLogoLight,
        },
        locale
      );
  }, [
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appLogoTickets,
      appName,
      locale,
      mode,
      primaryColorDark,
      primaryColorLight,
      topbarColorLight,
      topbarColorDark,
      sidebarColorLight,
      sidebarColorDark,
      buttonPrimaryColorLight,
      buttonPrimaryColorDark,
      buttonPrimaryTextColorLight,
      buttonPrimaryTextColorDark,
      buttonSecondaryColorLight,
    ]
  );

  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  useEffect(() => {
    const cid =
      isAuth && user?.companyId != null && !Number.isNaN(Number(user.companyId))
        ? Number(user.companyId)
        : null;

    let cancelled = false;
    const gp = getPublicSettingRef.current;

    const pickVal = (rows, key) => {
      if (!Array.isArray(rows)) return undefined;
      const v = rows.find((s) => s.key === key)?.value;
      return v != null && String(v).trim() !== "" ? v : undefined;
    };

    const logoUrl = (file) => {
      if (file == null || typeof file === "object") return null;
      const s = String(file).trim();
      if (!s || s === "[object Object]") return null;
      const u = resolvePublicUploadUrl(s);
      return u || null;
    };

    const settingText = (value, fallback = undefined) => {
      if (value == null || typeof value === "object") return fallback;
      const s = String(value).trim();
      if (!s || s === "[object Object]") return fallback;
      return s;
    };

    (async () => {
      try {
        if (cid != null) {
          const { data } = await api.get("/settings");
          if (cancelled) return;
          const rows = Array.isArray(data) ? data : [];
          const fb = async (key, defHex) => {
            const own = pickVal(rows, key);
            if (own != null) return own;
            const pub = await gp(key, cid);
            return pub != null ? pub : defHex;
          };
          const resolveHex = async (key) => {
            const own = pickVal(rows, key);
            if (own != null && isValidHex(own)) return own;
            const pub = await gp(key, cid);
            return pub && isValidHex(pub) ? pub : "";
          };

          const [
            pColorLight, pColorDark,
            btnPLight, btnPDark, btnPTxtLight, btnPTxtDark,
            btnSLight, btnSDark,
            tbLight, tbDark, sbLight, sbDark
          ] = await Promise.all([
            fb("primaryColorLight", BRAND_BLUE),
            fb("primaryColorDark", BRAND_BLUE),
            resolveHex("buttonPrimaryColorLight"),
            resolveHex("buttonPrimaryColorDark"),
            resolveHex("buttonPrimaryTextColorLight"),
            resolveHex("buttonPrimaryTextColorDark"),
            resolveHex("buttonSecondaryColorLight"),
            resolveHex("buttonSecondaryColorDark"),
            resolveHex("topbarColorLight"),
            resolveHex("topbarColorDark"),
            resolveHex("sidebarColorLight"),
            resolveHex("sidebarColorDark"),
          ]);

          let fL = pickVal(rows, "appLogoLight");
          if (!fL) fL = settingText(await gp("appLogoLight", cid));
          let fD = pickVal(rows, "appLogoDark");
          if (!fD) fD = settingText(await gp("appLogoDark", cid));
          let fF = pickVal(rows, "appLogoFavicon");
          if (!fF) fF = settingText(await gp("appLogoFavicon", cid));
          let fT = pickVal(rows, "appLogoTickets");
          if (!fT) fT = settingText(await gp("appLogoTickets", cid));
          const name = pickVal(rows, "appName");
          const resolvedName =
            settingText(name) ||
            settingText(await gp("appName", cid), APP_BRAND_NAME);

          if (cancelled) return;

          batchUpdates(() => {
            setPrimaryColorLight(pColorLight || BRAND_BLUE);
            setPrimaryColorDark(pColorDark || BRAND_BLUE);
            setButtonPrimaryColorLight(btnPLight);
            setButtonPrimaryColorDark(btnPDark);
            setButtonPrimaryTextColorLight(btnPTxtLight);
            setButtonPrimaryTextColorDark(btnPTxtDark);
            setButtonSecondaryColorLight(btnSLight);
            setButtonSecondaryColorDark(btnSDark);
            setTopbarColorLight(tbLight);
            setTopbarColorDark(tbDark);
            setSidebarColorLight(sbLight);
            setSidebarColorDark(sbDark);
            setAppLogoLight(logoUrl(fL) || defaultLogoLight);
            setAppLogoDark(logoUrl(fD) || defaultLogoDark);
            setAppLogoFavicon(logoUrl(fF) || defaultLogoFavicon);
            setAppLogoTickets(logoUrl(fT) || (mode === "light" ? DEFAULT_BRAND_LOGO_LIGHT : DEFAULT_BRAND_LOGO_DARK));
            setAppName(resolvedName);
          });
          return;
        }

        const loadVal = async (key) => {
          try {
            return await gp(key, null);
          } catch (e) {
            console.log("Error reading setting", e);
            return undefined;
          }
        };

        const [
          pcLight, pcDark,
          bpLight, bpDark, bptLight, bptDark,
          bsLight, bsDark,
          tLight, tDark, sLight, sDark,
          lLight, lDark, lFav, lTick, aName
        ] = await Promise.all([
          loadVal("primaryColorLight"),
          loadVal("primaryColorDark"),
          loadVal("buttonPrimaryColorLight"),
          loadVal("buttonPrimaryColorDark"),
          loadVal("buttonPrimaryTextColorLight"),
          loadVal("buttonPrimaryTextColorDark"),
          loadVal("buttonSecondaryColorLight"),
          loadVal("buttonSecondaryColorDark"),
          loadVal("topbarColorLight"),
          loadVal("topbarColorDark"),
          loadVal("sidebarColorLight"),
          loadVal("sidebarColorDark"),
          loadVal("appLogoLight"),
          loadVal("appLogoDark"),
          loadVal("appLogoFavicon"),
          loadVal("appLogoTickets"),
          loadVal("appName"),
        ]);

        if (cancelled) return;

        batchUpdates(() => {
          setPrimaryColorLight(pcLight || BRAND_BLUE);
          setPrimaryColorDark(pcDark || BRAND_BLUE);
          setButtonPrimaryColorLight(bpLight && isValidHex(bpLight) ? bpLight : "");
          setButtonPrimaryColorDark(bpDark && isValidHex(bpDark) ? bpDark : "");
          setButtonPrimaryTextColorLight(bptLight && isValidHex(bptLight) ? bptLight : "");
          setButtonPrimaryTextColorDark(bptDark && isValidHex(bptDark) ? bptDark : "");
          setButtonSecondaryColorLight(bsLight && isValidHex(bsLight) ? bsLight : "");
          setButtonSecondaryColorDark(bsDark && isValidHex(bsDark) ? bsDark : "");
          setTopbarColorLight(tLight && isValidHex(tLight) ? tLight : "");
          setTopbarColorDark(tDark && isValidHex(tDark) ? tDark : "");
          setSidebarColorLight(sLight && isValidHex(sLight) ? sLight : "");
          setSidebarColorDark(sDark && isValidHex(sDark) ? sDark : "");
          setAppLogoLight(logoUrl(lLight) || defaultLogoLight);
          setAppLogoDark(logoUrl(lDark) || defaultLogoDark);
          setAppLogoFavicon(logoUrl(lFav) || defaultLogoFavicon);
          setAppLogoTickets(
            logoUrl(lTick) || (mode === "light" ? DEFAULT_BRAND_LOGO_LIGHT : DEFAULT_BRAND_LOGO_DARK)
          );
          setAppName(settingText(aName, APP_BRAND_NAME));
        });
      } catch (e) {
        console.log("Theme load error", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuth, user?.companyId]);

  useEffect(() => {
    const root = document.documentElement;
    const brandLight = getSafeColor(primaryColorLight);
    const brandDark = getSafeColor(primaryColorDark);
    const sidebarLightEff =
      sidebarColorLight && isValidHex(sidebarColorLight)
        ? sidebarColorLight
        : LIGHT_SIDEBAR_DEFAULT;
    const sidebarDarkEff =
      sidebarColorDark && isValidHex(sidebarColorDark)
        ? sidebarColorDark
        : DARK_BG_DEFAULT;
    const topbarL = resolveTopbarHex(
      topbarColorLight,
      LIGHT_SIDEBAR_DEFAULT,
      LEGACY_TOPBAR_LIGHT
    );
    const topbarD = resolveTopbarHex(
      topbarColorDark,
      DARK_BG_DEFAULT,
      LEGACY_TOPBAR_DARK
    );
    /** Sidebar sempre com cor da topbar — alinhamento visual */
    const sidebarBgLightFinal = topbarL;
    const sidebarBgDarkFinal = topbarD;
    const topbarBg = mode === "light" ? topbarL : topbarD;
    const sidebarBgCss = mode === "light" ? sidebarBgLightFinal : sidebarBgDarkFinal;
    const topbarIconColor = getContrastTextForBackground(topbarBg);
    const primaryUi = mode === "light" ? brandLight : brandDark;
    root.style.setProperty("--primaryColor", primaryUi);
    const btnBg =
      mode === "light"
        ? buttonPrimaryColorLight && isValidHex(buttonPrimaryColorLight)
          ? buttonPrimaryColorLight
          : BUTTON_PRIMARY_DEFAULT
        : buttonPrimaryColorDark && isValidHex(buttonPrimaryColorDark)
          ? buttonPrimaryColorDark
          : BRAND_BLUE_DARK;
    const btnText =
      mode === "light"
        ? buttonPrimaryTextColorLight && isValidHex(buttonPrimaryTextColorLight)
          ? buttonPrimaryTextColorLight
          : getContrastTextForBackground(btnBg)
        : buttonPrimaryTextColorDark && isValidHex(buttonPrimaryTextColorDark)
          ? buttonPrimaryTextColorDark
          : getContrastTextForBackground(btnBg);
    root.style.setProperty("--buttonPrimaryColor", btnBg);
    root.style.setProperty("--buttonPrimaryTextColor", btnText);
    root.style.setProperty("--vb-button-primary", btnBg);
    root.style.setProperty("--vb-button-secondary", BUTTON_SECONDARY);
    root.style.setProperty("--vb-link", BRAND_BLUE_MEDIUM);
    root.style.setProperty("--vb-tag-bg", TAG_BG);
    root.style.setProperty("--vb-tag-text", TAG_TEXT);
    root.style.setProperty(
      "--vb-sidebar-bg",
      sidebarBgCss
    );
    root.style.setProperty("--vb-topbar-bg", topbarBg);
    root.style.setProperty("--vb-topbar-icon", topbarIconColor);
    root.style.colorScheme = mode === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", mode === "dark" ? "dark" : "light");
    root.classList.toggle("dark", mode === "dark");
  }, [
    primaryColorLight,
    primaryColorDark,
    topbarColorLight,
    topbarColorDark,
    sidebarColorLight,
    sidebarColorDark,
    buttonPrimaryColorLight,
    buttonPrimaryColorDark,
    buttonPrimaryTextColorLight,
    buttonPrimaryTextColorDark,
    mode,
  ]);

  useEffect(() => {
    async function fetchVersionData() {
      try {
        const response = await api.get("/version");
        const { data } = response;
        window.localStorage.setItem("frontendVersion", data.version);
      } catch (error) {
        console.log("Error fetching data", error);
      }
    }
    fetchVersionData();
  }, []);

  return (
    <>
      <Favicon
        url={
          appLogoFavicon
            ? appLogoFavicon
            : defaultLogoFavicon
        }
      />
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <MuiV5ThemeBridge>
            <QueryClientProvider client={queryClient}>
              <ActiveMenuProvider>
                <PageTitleProvider>
                  {children}
                </PageTitleProvider>
              </ActiveMenuProvider>
            </QueryClientProvider>
          </MuiV5ThemeBridge>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </>
  );
};

export default AppThemeRoot;
