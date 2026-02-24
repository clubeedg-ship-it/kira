import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
const storedTheme = window.localStorage.getItem('kira-theme');
if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
}
else {
    document.documentElement.classList.add('dark');
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(App, {}));
//# sourceMappingURL=main.js.map