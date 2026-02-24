import { useState } from 'react';
import FormRenderer, { type FormDefinition } from './FormRenderer';

export interface WizardDefinition {
  title: string;
  description?: string;
  steps: Array<FormDefinition & { id?: string }>;
}

interface WizardRendererProps {
  definition: WizardDefinition;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

export default function WizardRenderer({ definition, onSubmit, onCancel }: WizardRendererProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [allData, setAllData] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  const steps = definition.steps;
  const isLast = currentStep === steps.length - 1;

  const handleStepSubmit = async (data: Record<string, unknown>) => {
    const merged = { ...allData, ...data };
    setAllData(merged);

    if (isLast) {
      await onSubmit(merged);
      setSubmitted(true);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-zinc-100">All steps completed!</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  const step = steps[currentStep];

  // Override actions for wizard navigation
  const wizardActions = isLast
    ? [
        ...(currentStep > 0
          ? [{ label: 'Back', type: 'cancel' as const, variant: 'secondary' as const }]
          : []),
        { label: 'Submit', type: 'submit' as const, variant: 'primary' as const },
      ]
    : [
        ...(currentStep > 0
          ? [{ label: 'Back', type: 'cancel' as const, variant: 'secondary' as const }]
          : []),
        { label: 'Next', type: 'submit' as const, variant: 'primary' as const },
      ];

  const stepDef: FormDefinition = { ...step, actions: wizardActions };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div
          className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i < currentStep
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : i === currentStep
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}
            >
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px ${i < currentStep ? 'bg-green-500/30' : 'bg-zinc-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <h3 className="text-base font-medium text-zinc-200">{step.title}</h3>

      <FormRenderer
        key={currentStep}
        definition={stepDef}
        onSubmit={handleStepSubmit}
        onCancel={currentStep > 0 ? () => setCurrentStep(s => s - 1) : onCancel}
      />
    </div>
  );
}
