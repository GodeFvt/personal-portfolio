interface JsonViewerProps {
  content: string;
}

export default function JsonViewer({ content }: JsonViewerProps) {
  const lines = content.split('\n');

  return (
    <div className="code-view">
      {lines.map((line, index) => (
        <div key={`${index + 1}-${line}`} className="code-line">
          <span className="code-line__number">{index + 1}</span>
          <span className="code-line__content">{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}
