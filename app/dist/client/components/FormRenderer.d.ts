export interface FormField {
    name: string;
    type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'select' | 'checkbox' | 'date';
    label: string;
    placeholder?: string;
    required?: boolean;
    default?: string;
    options?: Array<{
        label: string;
        value: string;
    }>;
}
export interface FormAction {
    label: string;
    type: 'submit' | 'link' | 'cancel';
    url?: string;
    variant?: 'primary' | 'secondary' | 'danger';
}
export interface FormDefinition {
    title: string;
    description?: string;
    fields: FormField[];
    actions: FormAction[];
}
interface FormRendererProps {
    definition: FormDefinition;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    onCancel?: () => void;
}
export default function FormRenderer({ definition, onSubmit, onCancel }: FormRendererProps): import("react/jsx-runtime").JSX.Element;
export {};
