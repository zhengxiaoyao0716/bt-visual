import { LanguageName } from "./Locale";
import { createStorage } from "./Storage";

const defaultConfig = {
  language: "简体中文" as LanguageName,
  showTransWarning: false,
  nodeLibs: {
    fold: {
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
};

export default createStorage(
  "Config",
  "/config.yaml",
  Promise.resolve(defaultConfig),
  { local: true }
);
