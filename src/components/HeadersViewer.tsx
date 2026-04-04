interface HeadersViewerProps {
  headers: Record<string, string>;
}

export default function HeadersViewer({ headers }: HeadersViewerProps) {
  const rows = Object.entries(headers);

  return (
    <div className="table-shell">
      <div className="table-head table-head--three">
        <span>Header</span>
        <span>Value</span>
        <span>Note</span>
      </div>
      {rows.map(([key, value]) => (
        <div key={key} className="table-row table-row--three">
          <span>{key}</span>
          <span>{value}</span>
          <span>Response metadata emitted by the portfolio runtime.</span>
        </div>
      ))}
    </div>
  );
}
