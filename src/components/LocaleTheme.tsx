import DarkModeIcon from "@mui/icons-material/DarkMode";
import EditIcon from "@mui/icons-material/Edit";
import LanguageIcon from "@mui/icons-material/Language";
import LightModeIcon from "@mui/icons-material/LightMode";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import * as locales from "@mui/material/locale";
import { createTheme, useTheme } from "@mui/material/styles";
import { MouseEvent, useMemo, useState } from "react";

import { useTranslator } from "../locales/Translator";
import Config from "../storage/Config";
import { defaultLanguage, useTrans } from "../storage/Locale";

function ThemeHandler({
  config,
  language,
}: {
  config: ReturnType<typeof Config.use>;
  language: string;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpen = (event: MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const changeLocale = async (key: string) => {
    if (config?.value == null || config.saving || key === language) return;
    handleClose();
    await config.update({ ...config.value, language: key });
  };

  const translator = useTranslator();
  const editLocale = async (key: string) => {
    if (config?.value == null || config.saving) return;
    handleClose();
    await changeLocale(key);
    translator.show();
  };
  const languaes = config?.value?.languages ?? {};

  const themeMode = config?.value?.themeMode ?? "light";
  const toggleThemeMode = () => {
    if (config?.value == null || config.saving) return;
    config.update({
      ...config.value,
      themeMode: themeMode === "light" ? "dark" : "light",
    });
  };

  const trans = useTrans();
  return (
    <Box>
      <IconButton
        size="large"
        aria-label="language"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={handleOpen}
        color="inherit"
      >
        <LanguageIcon />
      </IconButton>
      <Menu open={anchorEl != null} anchorEl={anchorEl} onClose={handleClose}>
        {Object.keys(languaes).map((key, index) => (
          <MenuItem key={index}>
            <ListItemIcon onClick={() => editLocale(key)}>
              <EditIcon />
            </ListItemIcon>
            <ListItemText onClick={() => changeLocale(key)}>{key}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={toggleThemeMode}>
          <ListItemIcon>
            {themeMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </ListItemIcon>
          <ListItemText>
            {trans(`ThemeMode.${themeMode === "light" ? "dark" : "light"}`)}
          </ListItemText>
        </MenuItem>
      </Menu>
      {translator.dialog}
    </Box>
  );
}

export function useLocaleTheme() {
  const config = Config.use();

  const language = config?.value?.language ?? defaultLanguage;
  const code = config?.value?.languages?.[language] ?? "enUS";
  const locale = locales[code as keyof typeof locales];
  const fontFamily = config?.value?.fontFamily || [];

  const theme = useTheme();
  const themeMode = config?.value?.themeMode ?? "light";
  const themeWithLocale = useMemo(
    () =>
      createTheme(
        {
          ...theme,
          typography: {
            fontFamily: [
              ...fontFamily,
              "Sarasa Mono SC",
              "YouYuan",
              "FangSong",
              "monospace",
            ].join(","),
          },
          palette: { mode: themeMode },
        },
        locale
      ),
    [language, theme, themeMode]
  );

  const handler = useMemo(
    () => <ThemeHandler config={config} language={language} />,
    [config, language]
  );
  return {
    locale,
    theme: themeWithLocale,
    palette: themeWithLocale.palette,
    handler,
  };
}
