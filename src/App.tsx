import { Route, Routes } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import InfoIcon from "@mui/icons-material/Info";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@emotion/react";

import Home from "./pages/Home";
import {
  renderListItem,
  renderMenuIcon,
  useSideBar,
} from "./components/SideBar";
import Editor from "./editor";
import { useLocaleTheme } from "./components/LocaleTheme";
import Config from "./storage/Config";
import createLocale, { languages, useTrans } from "./storage/Locale";
import About from "./pages/About";

function SideBarMenu() {
  const trans = useTrans();
  return (
    <>
      <Toolbar />
      <Divider />
      <List component="nav">
        {renderListItem([<HomeIcon />, trans("HomePage"), Home.route])}
        {renderListItem([
          <AccountTreeIcon />,
          trans("EditorPage"),
          Editor.route,
        ])}
        {renderListItem(trans("other"))}
        {renderListItem([<InfoIcon />, trans("AboutPage"), About.route])}
      </List>
    </>
  );
}

function App() {
  const localeTheme = useLocaleTheme();
  const sideBar = useSideBar(renderMenuIcon, <SideBarMenu />);
  const config = Config.use();
  const Locale = createLocale(config?.value?.language ?? languages[0]);

  if (config?.error) {
    return (
      <Box>
        <AppBar>
          <Toolbar />
        </AppBar>
        <Toolbar />
        <Box sx={{ textAlign: "center" }} color="red">
          <Typography>{String(config.error)}</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={localeTheme.theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />

        <Locale>
          {(locale) =>
            locale?.value == null ? (
              <Box>
                <AppBar>
                  <Toolbar />
                </AppBar>
                <Toolbar />
                <Box sx={{ ml: 6 }}>
                  <Skeleton width="60vw" height="60vh" />
                  <Skeleton width="60vw" height="10vh" />
                  <Skeleton width="45vw" height="10vh" />
                </Box>
              </Box>
            ) : (
              <>
                <AppBar
                  position="fixed"
                  sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
                >
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
                    backgroundColor: ({ palette }) =>
                      palette.grey[palette.mode === "light" ? 100 : 900],
                    flexGrow: 1,
                    height: "100vh",
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Toolbar />
                  <Routes>
                    <Route path={Home.route} element={<Home />} />
                    <Route path={Editor.route} element={<Editor />} />
                    <Route path={About.route} element={<About />} />
                  </Routes>
                </Box>
              </>
            )
          }
        </Locale>
      </Box>
    </ThemeProvider>
  );
}

export default Config.hoc(App);
