import { type FormDefinition } from './FormRenderer';
export interface WizardDefinition {
    title: string;
    description?: string;
    steps: Array<FormDefinition & {
        id?: string;
    }>;
}
interface WizardRendererProps {
    definition: WizardDefinition;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onCancel?: () => void;
}
export default function WizardRenderer({ definition, onSubmit, onCancel }: WizardRendererProps): import("react/jsx-runtime").JSX.Element;
export {};
