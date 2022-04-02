import { Route, Routes } from 'react-router-dom'
import HomeIcon from '@mui/icons-material/Home'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'

import Home from './pages/Home'
import { renderListItem, renderMenuIcon, useSideBar } from './components/SideBar'
import Editor from './editor'
import { useLocaleTheme } from './components/LocaleTheme'
import { ThemeProvider } from '@emotion/react'

function App() {
  const localeTheme = useLocaleTheme()

  const sideBar = useSideBar(renderMenuIcon, (
    <>
      <Toolbar />
      <Divider />
      <List component="nav">
        {renderListItem([<HomeIcon />, 'Home', '/'])}
        {renderListItem('other')}
        {renderListItem([<AccountTreeIcon />, 'Editor', Editor.route])}
      </List>
    </>
  ))

  return (
    <ThemeProvider theme={localeTheme.theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />

        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            {sideBar.handler}
            <Box sx={{ flexGrow: 1 }} />
            {localeTheme.handler}
          </Toolbar>
        </AppBar>

        {sideBar.drawer}

        <Box
          component="main"
          sx={{
            backgroundColor: ({ palette }) => palette.grey[palette.mode === 'light' ? 100 : 900],
            flexGrow: 1,
            height: '100vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
          <Toolbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path={Editor.route} element={<Editor />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
