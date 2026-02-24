import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
import en from './en.json';
import pt from './pt.json';
import es from './es.json';
import nl from './nl.json';
import de from './de.json';
import fr from './fr.json';
import zh from './zh.json';
import ja from './ja.json';
import ko from './ko.json';
import ar from './ar.json';
import it from './it.json';
import ru from './ru.json';
const LANGUAGES = { en, pt, es, nl, de, fr, zh, ja, ko, ar, it, ru };
export const LANGUAGE_OPTIONS = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];
const I18nContext = createContext({
    lang: 'en',
    setLang: () => { },
    t: (key) => key,
});
export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(() => {
        const stored = localStorage.getItem('kira-lang');
        if (stored && LANGUAGES[stored])
            return stored;
        const browserLang = navigator.language?.slice(0, 2);
        if (browserLang && LANGUAGES[browserLang])
            return browserLang;
        return 'en';
    });
    const setLang = useCallback((newLang) => {
        setLangState(newLang);
        localStorage.setItem('kira-lang', newLang);
        document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    }, []);
    const t = useCallback((key, vars) => {
        const dict = LANGUAGES[lang] || LANGUAGES.en;
        let text = dict[key] || LANGUAGES.en[key] || key;
        if (vars) {
            for (const [k, v] of Object.entries(vars)) {
                text = text.replace(`{${k}}`, v);
            }
        }
        return text;
    }, [lang]);
    return (_jsx(I18nContext.Provider, { value: { lang, setLang, t }, children: children }));
}
export function useI18n() {
    return useContext(I18nContext);
}
//# sourceMappingURL=index.js.map