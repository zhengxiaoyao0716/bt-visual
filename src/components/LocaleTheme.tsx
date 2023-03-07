import { useMemo, useState, MouseEvent } from "react";
import { createTheme, useTheme as useMUITheme } from "@mui/material/styles";
import * as locales from "@mui/material/locale";
import LanguageIcon from "@mui/icons-material/Language";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import EditIcon from "@mui/icons-material/Edit";
import ListItemIcon from "@mui/material/ListItemIcon";

import Config from "../storage/Config";
import { useTranslator } from "../locales/Translator";
import ListItemText from "@mui/material/ListItemText";
import { defaultLanguage } from "../storage/Locale";

function LocaleHandler({
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

  const theme = useMUITheme();
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
        },
        locale
      ),
    [language, theme]
  );

  const handler = useMemo(
    () => <LocaleHandler config={config} language={language} />,
    [config, language]
  );
  return { locale, theme: themeWithLocale, handler };
}
