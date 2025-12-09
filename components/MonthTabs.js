// components/MonthTabs.js
"use client";

function generateMonths(currentValue) {
  const now = new Date();
  const result = [];
  
  // Future month - selalu di sebelah kiri "Sekarang"
  const future = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const futureY = future.getFullYear();
  const futureM = String(future.getMonth() + 1).padStart(2, "0");
  result.push({
    value: `${futureY}-${futureM}`,
    label: "Future"
  });
  
  // Current month - "Sekarang"
  const currentY = now.getFullYear();
  const currentM = String(now.getMonth() + 1).padStart(2, "0");
  result.push({
    value: `${currentY}-${currentM}`,
    label: "Sekarang"
  });
  
  // Last 5 months
  for (let i = 1; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const shortMonth = d.toLocaleDateString("id-ID", { month: "short" });
    const shortYear = String(y).slice(-2);
    
    result.push({
      value: `${y}-${m}`,
      label: `${shortMonth}-${shortYear}`
    });
  }
  
  return result;
}

export default function MonthTabs({ value, onChange }) {
  const months = generateMonths(value);
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {months.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
            value === m.value
              ? 'bg-white text-black shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 scale-105'
              : 'bg-gray-800/50 backdrop-blur border border-gray-700/50 text-gray-300 hover:bg-white/10 hover:text-white hover:border-gray-600 hover:scale-105'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
