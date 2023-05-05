import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BugReportIcon from "@mui/icons-material/BugReport";
import HomeIcon from "@mui/icons-material/Home";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { Route, Routes } from "react-router-dom";

import globalShare from "./common/share";
import Loading from "./components/Loading";
import { useLocaleTheme } from "./components/LocaleTheme";
import {
  renderListItem,
  renderMenuIcon,
  useSideBar,
} from "./components/SideBar";
import ToolBarSlot from "./components/ToolBarSlot";
import Debugger from "./debugger";
import Editor from "./editor";
import Home from "./pages/Home";
import Config from "./storage/Config";
import createLocale, { defaultLanguage, useTrans } from "./storage/Locale";

function SideBarMenu() {
  const trans = useTrans();
  const shareSideBars = globalShare?.sideBars ?? [];
  return (
    <>
      <Toolbar variant="dense" />
      <Divider />
      <List component="nav">
        {renderListItem([<HomeIcon />, trans("HomePage"), Home.route])}
        {renderListItem([
          <AccountTreeIcon />,
          trans("EditorPage"),
          Editor.route,
        ])}
        {renderListItem([<BugReportIcon />, trans("Debugger"), Debugger.route])}
        {shareSideBars.length > 0 ? renderListItem(trans("other")) : null}
        {shareSideBars.map(({ title, href, target }, index) =>
          renderListItem([<Box />, title, href, target], index)
        )}
      </List>
    </>
  );
}

function App() {
  const config = Config.use();
  const localeTheme = useLocaleTheme();
  const Locale = createLocale(config?.value?.language ?? defaultLanguage);
  const sideBar = useSideBar(renderMenuIcon, <SideBarMenu />);

  const toolBarSlotRef = ToolBarSlot.useRef();

  if (config?.error) {
    return (
      <Box>
        <AppBar>
          <Toolbar variant="dense" />
        </AppBar>
        <Toolbar variant="dense" />
        <Box sx={{ textAlign: "center" }} color="red">
          <Typography>{String(config.error)}</Typography>
        </Box>
      </Box>
    );
  }

  const { palette } = localeTheme.theme;
  return (
    <ThemeProvider theme={localeTheme.theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />

        <Locale>
          {(locale) =>
            locale?.value == null ? (
              <Box>
                <AppBar>
                  <Toolbar variant="dense" />
                </AppBar>
                <Toolbar variant="dense" />
                <Loading />
              </Box>
            ) : (
              <>
                <AppBar
                  position="fixed"
                  sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
                >
                  <Toolbar variant="dense">
                    {sideBar.handler}
                    <Box sx={{ ml: 2 }} />
                    <ToolBarSlot.Node slotRef={toolBarSlotRef} />
                    <Box sx={{ flexGrow: 1 }} />
                    {localeTheme.handler}
                  </Toolbar>
                </AppBar>

                {sideBar.drawer}

                <Box
                  id="main"
                  component="main"
                  sx={{
                    backgroundColor:
                      palette.grey[palette.mode === "light" ? 100 : 900],
                    flexGrow: 1,
                    height: "100vh",
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Toolbar variant="dense" />
                  <ToolBarSlot.Provider value={toolBarSlotRef}>
                    <Routes>
                      <Route path={Home.route}>
                        <Route index element={<Home />} />
                        <Route
                          path={`${Editor.route}/*`}
                          element={<Editor />}
                        />
                        <Route path={Debugger.route} element={<Debugger />} />
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
