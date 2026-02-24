import { type HTMLAttributes } from 'react';
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
    name?: string;
    src?: string | null;
    size?: AvatarSize;
}
export declare function Avatar({ className, name, src, size, ...props }: AvatarProps): import("react/jsx-runtime").JSX.Element;
export {};
