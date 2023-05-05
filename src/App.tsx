import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BugReportIcon from "@mui/icons-material/BugReport";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { Navigate, Route, Routes } from "react-router-dom";

import Loading from "./components/Loading";
import { useLocaleTheme } from "./components/LocaleTheme";
import ToolBarSlot from "./components/ToolBarSlot";
import Debugger from "./debugger";
import Editor from "./editor";
import Config from "./storage/Config";
import createLocale, { defaultLanguage, useTrans } from "./storage/Locale";

function SideBarMenu() {
  const trans = useTrans();
  return (
    <>
      {/* <IconButton title={trans("HomePage")} href={Home.route}>
        <HomeIcon />
      </IconButton> */}
      <IconButton title={trans("EditorPage")} href={Editor.route}>
        <AccountTreeIcon />
      </IconButton>
      <IconButton title={trans("Debugger")} href={Debugger.route}>
        <BugReportIcon />
      </IconButton>
    </>
  );
}

function App() {
  const config = Config.use();
  const localeTheme = useLocaleTheme();
  const Locale = createLocale(config?.value?.language ?? defaultLanguage);

  const toolBarSlotRef = ToolBarSlot.useRef();

  if (config?.error) {
    return (
      <Box sx={{ m: 2, textAlign: "center" }} color="red">
        <Typography>{String(config.error)}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={localeTheme.theme}>
      <CssBaseline />
      <Locale>
        {(locale) => (
          <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <Box
              sx={{
                // width: "2.5em",
                height: "100%",
                // overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                borderRight: ({ palette }) => `1px solid ${palette.divider}`,
                background: ({ palette }) => palette.background.default,
              }}
            >
              <SideBarMenu />
              <ToolBarSlot.Node slotRef={toolBarSlotRef} />
              <Box sx={{ flexGrow: 1 }} />
              {localeTheme.handler}
            </Box>

            <Box
              id="main"
              component="main"
              sx={{
                backgroundColor: ({ palette }) =>
                  palette.grey[palette.mode === "light" ? 100 : 900],
                flexGrow: 1,
                width: "100%",
                height: "100%",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {locale?.value == null ? (
                <Loading />
              ) : (
                <ToolBarSlot.Provider value={toolBarSlotRef}>
                  <Routes>
                    <Route path="/">
                      <Route index element={<Navigate to={Editor.route} />} />
                      <Route path={`${Editor.route}/*`} element={<Editor />} />
                      <Route path={Debugger.route} element={<Debugger />} />
                    </Route>
                  </Routes>
                </ToolBarSlot.Provider>
              )}
            </Box>
          </Box>
        )}
      </Locale>
    </ThemeProvider>
  );
}

export default Config.hoc(App);
