import { useMemo } from "react";
import Config from "./Config";
import { ContextValue, createStorage, Storage } from "./Storage";

export const languages = ["English", "简体中文"] as const;
export type LanguageName = typeof languages[number];

interface Locale {
  [key: string]: string;
}

const locales: { [key: string]: () => Promise<{ default: Locale }> } = {
  English: () => import("../locales/en-US.json"),
  简体中文: () => import("../locales/zh-CN.json"),
};
const LocalStorages: { [lang: string]: Storage<Locale> } = {};

export default function createLocale(language: LanguageName): Storage<Locale> {
  const path = `/locale/${language}.yaml`;
  const preset = locales[language];
  const locale =
    (preset && preset().then(({ default: locale }) => locale)) ||
    Promise.resolve({});
  const exist = LocalStorages[language];
  if (exist != null) return exist;
  const Storage = createStorage(language, path, locale);
  LocalStorages[language] = Storage;
  return Storage;
}

export function useLocale(): ContextValue<Locale> {
  const config = Config.use();
  const language = config?.value?.language ?? languages[0];
  const Storage = LocalStorages[language];
  return Storage.use();
}

export interface TransFunction {
  (text: string): string;
  language: LanguageName;
}
export function useTrans(): TransFunction {
  const config = Config.use();
  const language = config?.value?.language ?? languages[0];
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
    trans.language = language;
    return trans;
  }, [locale, showTransWarning]);
}
