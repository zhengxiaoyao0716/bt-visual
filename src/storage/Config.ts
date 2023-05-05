import { PaletteMode } from "@mui/material";
import { createStorage } from "./Storage";

export const defaultConfig = {
  languages: {
    English: "enUS",
    简体中文: "zhCN",
    // 日本語: "jaJP",
  } as { [name: string]: string },
  language: undefined as undefined | string,
  themeMode: "light" as PaletteMode,
  showTransWarning: false,
  nodeLibs: {
    expanded: {
      Composite: false,
      Decorator: false,
      Action: false,
    },
    width: 256.0,
    minWidth: 128.0,
  },
  properties: {
    width: 256.0,
    minWidth: 128.0,
  },
  nodeVerticalMargin: 128,
  serverAddress: "ws://localhost:60013/bt-visual/debug",
  fontFamily: [],
  nodePropsHelp: false,
};

export default createStorage(
  "Config",
  "/config.yaml",
  () => Promise.resolve(defaultConfig),
  { local: true }
);
