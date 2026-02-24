import { type HTMLAttributes } from 'react';
type CardVariant = 'flat' | 'raised' | 'elevated';
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
}
export declare function Card({ className, variant, ...props }: CardProps): import("react/jsx-runtime").JSX.Element;
export declare function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
export declare function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>): import("react/jsx-runtime").JSX.Element;
export declare function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>): import("react/jsx-runtime").JSX.Element;
export declare function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
export declare function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
export {};
