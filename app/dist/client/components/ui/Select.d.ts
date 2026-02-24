import { type ReactNode, type SelectHTMLAttributes } from 'react';
interface SelectOption {
    label: string;
    value: string;
}
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    placeholder?: string;
    icon?: ReactNode;
    options?: SelectOption[];
}
export declare const Select: import("react").ForwardRefExoticComponent<SelectProps & import("react").RefAttributes<HTMLSelectElement>>;
export {};
