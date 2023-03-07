import { useMemo } from "react";

import Config from "./Config";
import { ContextValue, createStorage, Storage } from "./Storage";

export const defaultLanguage =
  navigator.language === "zh" ? "简体中文" : "English";

interface Locale {
  [key: string]: string;
}

const locales: { [key: string]: () => Promise<{ default: Locale }> } = {
  English: () => import("../locales/en-US.json"),
  简体中文: () => import("../locales/zh-CN.json"),
};
const LocalStorages: { [lang: string]: Storage<Locale> } = {};

export default function createLocale(language: string): Storage<Locale> {
  const exist = LocalStorages[language];
  if (exist != null) return exist;

  const path = `/locale/${language}.yaml`;
  const preset = locales[language] ?? locales["English"];
  const locale =
    (preset && preset().then(({ default: locale }) => locale)) ||
    Promise.resolve({});
  const Storage = createStorage(language, path, locale);
  LocalStorages[language] = Storage;
  return Storage;
}

export function useLocale(): ContextValue<Locale> {
  const config = Config.use();
  const language = config?.value?.language ?? defaultLanguage;
  const Storage = LocalStorages[language];
  return Storage.use();
}

export interface TransFunction {
  (text: string, replaces?: { [key: string]: any }): string;
  language: string;
}
export function useTrans(): TransFunction {
  const config = Config.use();
  const language = config?.value?.language ?? defaultLanguage;
  const locale = useLocale();
  const showTransWarning = config?.value?.showTransWarning ?? false;
  return useMemo(() => {
    function trans(text: string) {
      if (locale?.value == null) return text;
      const translated = locale.value[text];
      if (translated != null) return translated;
      showTransWarning && console.warn(new Error(`[${language}] ${text}`));
      return text;
    }
    function replace(text: string, replaces?: { [key: string]: any }) {
      let translated = trans(text);
      if (replaces == null) return translated;
      for (const key in replaces) {
        const value = replaces[key];
        translated = translated.replace(`\${${key}}`, value);
      }
      // translated.replace
      return translated;
    }
    replace.language = language;
    return replace;
  }, [locale, showTransWarning]);
}
