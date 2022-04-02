import { useMemo, useState, MouseEvent } from 'react'
import { createTheme, useTheme as useMUITheme } from '@mui/material/styles'
import { enUS, zhCN } from '@mui/material/locale'
import LanguageIcon from '@mui/icons-material/Language'
import Box from '@mui/system/Box'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'

const locales = { 'english': enUS, '简体中文': zhCN }
type LocaleKey = keyof typeof locales
const localKeys = Object.keys(locales) as LocaleKey[]

export function useLocaleTheme() {
    const theme = useMUITheme();
    const [localKey, setLocaleKey] = useState<LocaleKey>('简体中文');
    const locale = locales[localKey];
    const themeWithLocale = useMemo(
        () => createTheme(theme, locale),
        [localKey, theme],
    );

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const handleMenu = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
    const handleClose = () => setAnchorEl(null)
    const changeLocale = (key: LocaleKey) => {
        setLocaleKey(key)
        handleClose()
    }

    const handler = (
        <Box>
            <IconButton
                size="large"
                aria-label="language"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
            >
                <LanguageIcon />
            </IconButton>
            <Menu
                open={anchorEl != null}
                anchorEl={anchorEl}
                keepMounted
                onClose={handleClose}
            >
                {localKeys.map(key => (
                    <MenuItem key={key} onClick={() => changeLocale(key)}>{key}</MenuItem>
                ))}
            </Menu>
        </Box>
    )
    return { locale, theme: themeWithLocale, handler }
}
