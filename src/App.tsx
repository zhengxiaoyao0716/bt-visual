import { ThemeProvider } from "@emotion/react";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Skeleton from "@mui/material/Skeleton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Route, Routes } from "react-router-dom";

import { useLocaleTheme } from "./components/LocaleTheme";
import { getShareSideBars } from "./components/share";
import {
  renderListItem,
  renderMenuIcon,
  useSideBar,
} from "./components/SideBar";
import ToolBarSlot from "./components/ToolBarSlot";
import Editor from "./editor";
import Help from "./pages/Help";
import Home from "./pages/Home";
import Config from "./storage/Config";
import createLocale, { languages, useTrans } from "./storage/Locale";

function SideBarMenu() {
  const trans = useTrans();
  const shareSideBars = getShareSideBars();
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
        {renderListItem([<InfoIcon />, trans("HelpPage"), Help.route])}
        {shareSideBars.map(({ title, href }, index) =>
          renderListItem([<Box />, title, href], index)
        )}
      </List>
    </>
  );
}

function Loading() {
  return (
    <>
      <Skeleton width="60vw" height="60vh" />
      <Skeleton width="60vw" height="10vh" />
      <Skeleton width="45vw" height="10vh" />
    </>
  );
}

function App() {
  const localeTheme = useLocaleTheme();
  const sideBar = useSideBar(renderMenuIcon, <SideBarMenu />);
  const config = Config.use();
  const Locale = createLocale(config?.value?.language ?? languages[0]);

  const toolBarSlotRef = ToolBarSlot.useRef();

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
                  <Loading />
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
                    <Box sx={{ ml: 2 }} />
                    <ToolBarSlot.Node slotRef={toolBarSlotRef} />
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
                  <ToolBarSlot.Provider value={toolBarSlotRef}>
                    <Routes>
                      <Route path={Home.route}>
                        <Route index element={<Home />} />
                        <Route
                          path={`${Editor.route}/*`}
                          element={<Editor />}
                        />
                        <Route path={Help.route} element={<Help />} />
                      </Route>
                    </Routes>
                  </ToolBarSlot.Provider>
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
