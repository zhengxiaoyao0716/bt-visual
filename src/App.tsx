import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BugReportIcon from "@mui/icons-material/BugReport";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { ReactNode } from "react";
import Define from "./behavior-tree/Define";
import Loading from "./components/Loading";
import { useLocaleTheme } from "./components/LocaleTheme";
import Snack from "./components/Snack";
import ToolBarSlot from "./components/ToolBarSlot";
import Debugger from "./debugger";
import { EditorRoutes } from "./editor";
import Config from "./storage/Config";
import createLocale, { defaultLanguage, useTrans } from "./storage/Locale";

function SideBarMenu() {
  const trans = useTrans();
  return (
    <>
      {/* <IconButton title={trans("HomePage")} href={Home.route}>
        <HomeIcon />
      </IconButton> */}
      <IconButton title={trans("EditorPage")} href={EditorRoutes.routeMain}>
        <AccountTreeIcon />
      </IconButton>
      <IconButton title={trans("Debugger")} href={Debugger.route}>
        <BugReportIcon />
      </IconButton>
    </>
  );
}

function App({ noFrame, children }: { noFrame?: true; children: ReactNode }) {
  const config = Config.use();
  const localeTheme = useLocaleTheme();
  const Locale = createLocale(config?.value?.language ?? defaultLanguage);

  const toolBarSlotRef = ToolBarSlot.useRef();

  if (config?.error) {
    return (
      <ThemeProvider theme={localeTheme.theme}>
        <CssBaseline />
        <Container sx={{ p: 2 }}>
          <Alert severity="error">{String(config?.error)}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={localeTheme.theme}>
      <CssBaseline />
      <Locale>
        {(locale) => (
          <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            {noFrame ? null : (
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
            )}

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
                  {children}
                </ToolBarSlot.Provider>
              )}
            </Box>
          </Box>
        )}
      </Locale>
    </ThemeProvider>
  );
}

function AppRoutes() {
  return (
    <Config>
      <Snack>
        <Routes>
          <Route path="/">
            <Route index element={<Navigate to={EditorRoutes.routeMain} />} />
            {EditorRoutes((children, noFrame) => (
              <App noFrame={noFrame}>
                <Define>{children}</Define>
              </App>
            ))}
            <Route
              path={Debugger.route}
              element={
                <App>
                  <Debugger />
                </App>
              }
            />
            <Route
              path="*"
              loader={Config.load}
              element={
                <App>
                  <Container sx={{ p: 2 }}>
                    <Alert severity="error">404 Not Found</Alert>
                  </Container>
                </App>
              }
            />
          </Route>
        </Routes>
      </Snack>
    </Config>
  );
}

// export default (
//   <RouterProvider
//     router={createBrowserRouter([{ path: "/*", Component: AppRoutes }])}
//   />
// );
export default (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);
