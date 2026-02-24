import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import FormRenderer from './FormRenderer';
export default function WizardRenderer({ definition, onSubmit, onCancel }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [allData, setAllData] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const steps = definition.steps;
    const isLast = currentStep === steps.length - 1;
    const handleStepSubmit = async (data) => {
        const merged = { ...allData, ...data };
        setAllData(merged);
        if (isLast) {
            await onSubmit(merged);
            setSubmitted(true);
        }
        else {
            setCurrentStep(s => s + 1);
        }
    };
    if (submitted) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-4", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center", children: _jsx("svg", { className: "w-8 h-8 text-green-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-lg font-medium text-zinc-100", children: "All steps completed!" }), onCancel && (_jsx("button", { onClick: onCancel, className: "text-sm text-zinc-400 hover:text-zinc-200 transition-colors", children: "Dismiss" }))] }));
    }
    const step = steps[currentStep];
    // Override actions for wizard navigation
    const wizardActions = isLast
        ? [
            ...(currentStep > 0
                ? [{ label: 'Back', type: 'cancel', variant: 'secondary' }]
                : []),
            { label: 'Submit', type: 'submit', variant: 'primary' },
        ]
        : [
            ...(currentStep > 0
                ? [{ label: 'Back', type: 'cancel', variant: 'secondary' }]
                : []),
            { label: 'Next', type: 'submit', variant: 'primary' },
        ];
    const stepDef = { ...step, actions: wizardActions };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "w-full bg-zinc-800 rounded-full h-1.5", children: _jsx("div", { className: "bg-violet-500 h-1.5 rounded-full transition-all duration-300", style: { width: `${((currentStep + 1) / steps.length) * 100}%` } }) }), _jsx("div", { className: "flex items-center justify-center gap-3", children: steps.map((s, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${i < currentStep
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : i === currentStep
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`, children: i < currentStep ? '✓' : i + 1 }), i < steps.length - 1 && (_jsx("div", { className: `w-8 h-px ${i < currentStep ? 'bg-green-500/30' : 'bg-zinc-700'}` }))] }, i))) }), _jsx("h3", { className: "text-base font-medium text-zinc-200", children: step.title }), _jsx(FormRenderer, { definition: stepDef, onSubmit: handleStepSubmit, onCancel: currentStep > 0 ? () => setCurrentStep(s => s - 1) : onCancel }, currentStep)] }));
}
//# sourceMappingURL=WizardRenderer.js.map