import { jsx as _jsx } from "react/jsx-runtime";
export default function HtmlCanvas({ html }) {
    return (_jsx("iframe", { srcDoc: html, sandbox: "allow-scripts", className: "w-full h-full border-0 rounded-lg bg-white", style: { minHeight: '400px' }, title: "Canvas Content" }));
}
//# sourceMappingURL=HtmlCanvas.js.map