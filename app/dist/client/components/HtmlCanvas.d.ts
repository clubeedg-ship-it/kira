interface HtmlCanvasProps {
    html: string;
    onMessage?: (data: unknown) => void;
}
export default function HtmlCanvas({ html }: HtmlCanvasProps): import("react/jsx-runtime").JSX.Element;
export {};
