import { type ReactNode } from 'react';
export declare const LANGUAGE_OPTIONS: {
    code: string;
    name: string;
    flag: string;
}[];
interface I18nContextType {
    lang: string;
    setLang: (lang: string) => void;
    t: (key: string, vars?: Record<string, string>) => string;
}
export declare function I18nProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useI18n(): I18nContextType;
export {};
