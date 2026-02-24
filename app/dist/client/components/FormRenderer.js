import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function FormRenderer({ definition, onSubmit, onCancel }) {
    const [values, setValues] = useState(() => {
        const defaults = {};
        for (const f of definition.fields) {
            defaults[f.name] = f.type === 'checkbox' ? false : (f.default || '');
        }
        return defaults;
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const set = (name, value) => setValues(v => ({ ...v, [name]: value }));
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await onSubmit(values);
            setSubmitted(true);
        }
        finally {
            setSubmitting(false);
        }
    };
    if (submitted) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-green-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-lg font-medium text-zinc-100", children: "Submitted successfully" }), onCancel && (_jsx("button", { onClick: onCancel, className: "text-sm text-zinc-400 hover:text-zinc-200 transition-colors", children: "Dismiss" }))] }));
    }
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [definition.description && (_jsx("p", { className: "text-sm text-zinc-400", children: definition.description })), definition.fields.map((field) => (_jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "block text-sm font-medium text-zinc-300", children: [field.label, field.required && _jsx("span", { className: "text-violet-400 ml-1", children: "*" })] }), field.type === 'textarea' ? (_jsx("textarea", { value: values[field.name] || '', onChange: e => set(field.name, e.target.value), placeholder: field.placeholder, required: field.required, rows: 4, className: "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y" })) : field.type === 'select' ? (_jsxs("select", { value: values[field.name] || '', onChange: e => set(field.name, e.target.value), required: field.required, className: "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors", children: [_jsx("option", { value: "", children: field.placeholder || 'Select...' }), field.options?.map(opt => (_jsx("option", { value: opt.value, children: opt.label }, opt.value)))] })) : field.type === 'checkbox' ? (_jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: !!values[field.name], onChange: e => set(field.name, e.target.checked), className: "w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-0" }), _jsx("span", { className: "text-sm text-zinc-400", children: field.placeholder || field.label })] })) : (_jsx("input", { type: field.type, value: values[field.name] || '', onChange: e => set(field.name, e.target.value), placeholder: field.placeholder, required: field.required, className: "w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors" }))] }, field.name))), _jsx("div", { className: "flex gap-3 pt-2", children: definition.actions.map((action, i) => {
                    if (action.type === 'link') {
                        return (_jsx("a", { href: action.url, target: "_blank", rel: "noopener noreferrer", className: "px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors", children: action.label }, i));
                    }
                    if (action.type === 'cancel') {
                        return (_jsx("button", { type: "button", onClick: onCancel, className: "px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors", children: action.label }, i));
                    }
                    const variantClass = action.variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-500'
                        : action.variant === 'secondary'
                            ? 'bg-zinc-700 hover:bg-zinc-600'
                            : 'bg-violet-600 hover:bg-violet-500';
                    return (_jsx("button", { type: "submit", disabled: submitting, className: `px-5 py-2.5 text-sm font-medium rounded-lg text-white ${variantClass} transition-colors disabled:opacity-50`, children: submitting ? 'Submitting...' : action.label }, i));
                }) })] }));
}
//# sourceMappingURL=FormRenderer.js.map