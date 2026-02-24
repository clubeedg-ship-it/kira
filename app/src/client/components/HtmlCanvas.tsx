interface HtmlCanvasProps {
  html: string;
  onMessage?: (data: unknown) => void;
}

export default function HtmlCanvas({ html }: HtmlCanvasProps) {
  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts"
      className="w-full h-full border-0 rounded-lg bg-white"
      style={{ minHeight: '400px' }}
      title="Canvas Content"
    />
  );
}
