"use client";

export function PrintButton() {
  return (
    <button className="btn btn-secondary self-start print:hidden" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
