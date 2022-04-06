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
    width: 300.0,
    minWidth: 160.0,
  },
};

export default createStorage(
  "Config",
  "/config.yaml",
  Promise.resolve(defaultConfig),
  { local: true }
);
