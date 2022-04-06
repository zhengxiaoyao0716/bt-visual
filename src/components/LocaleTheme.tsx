import { useMemo, useState, MouseEvent } from "react";
import { createTheme, useTheme as useMUITheme } from "@mui/material/styles";
import { enUS, Localization, zhCN } from "@mui/material/locale";
import LanguageIcon from "@mui/icons-material/Language";
import Box from "@mui/system/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import EditIcon from "@mui/icons-material/Edit";
import ListItemIcon from "@mui/material/ListItemIcon";
import { ListItemText } from "@mui/material";

import { LanguageName, languages } from "../storage/Locale";
import Config from "../storage/Config";
import { useTranslator } from "../locales/Translator";

export const locales: { [key in LanguageName]: Localization } = {
  English: enUS,
  简体中文: zhCN,
};

export function useLocaleTheme() {
  const config = Config.use();

  const language = config?.value?.language || languages[0];
  const locale = locales[language];

  const theme = useMUITheme();
  const themeWithLocale = useMemo(
    () => createTheme(theme, locale),
    [language, theme]
  );

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const handleOpen = (event: MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const changeLocale = async (key: LanguageName) => {
    if (config?.value == null || config.saving || key === language) return;
    handleClose();
    await config.update({ ...config.value, language: key });
  };

  const translator = useTranslator();
  const editLocale = async (key: LanguageName) => {
    if (config?.value == null || config.saving) return;
    handleClose();
    await changeLocale(key);
    translator.show();
  };

  const handler = (
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
        {languages.map((key, index) => (
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
  return { locale, theme: themeWithLocale, handler };
}
