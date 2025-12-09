// components/TypeTabs.js
"use client";

export default function TypeTabs({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {[
        { label: "Pemasukan", value: "income" },
        { label: "Pengeluaran", value: "expense" },
      ].map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={{
            padding: "4px 12px",
            borderRadius: 16,
            border: "1px solid #ccc",
            background: value === t.value ? "#333" : "white",
            color: value === t.value ? "white" : "black",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
