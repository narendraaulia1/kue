"use client";

import { useEffect, useState, useRef } from "react";
import { collection, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { EllipsisVertical } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { db } from "../lib/firebase";

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num || 0);
}

export default function TransactionList({ month, onEdit }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [loading, setLoading] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuContainerRef = useRef(null);

  // 🔥 Realtime listener transaksi
  useEffect(() => {
    if (!user || !month) {
      setTransactions([]);
      setGrouped({});
      return;
    }

    setLoading(true);

    const ref = collection(db, "users", user.id, "transactions");

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs
          .map((d) => {
            const data = d.data();
            let dateObj = null;

            if (data.date) {
              dateObj = data.date.toDate
                ? data.date.toDate()
                : new Date(data.date);
            }

            return {
              id: d.id,
              ...data,
              _dateObj: dateObj,
            };
          })
          .filter((tx) => {
            if (!tx._dateObj) return false;
            const y = tx._dateObj.getFullYear();
            const m = String(tx._dateObj.getMonth() + 1).padStart(2, "0");
            return `${y}-${m}` === month;
          })
          .sort((a, b) => b._dateObj - a._dateObj);

        setTransactions(list);

        const groups = {};

        list.forEach((tx) => {
          const key = tx._dateObj.toISOString().slice(0, 10);

          if (!groups[key]) {
            groups[key] = {
              dateObj: tx._dateObj,
              items: [],
              income: 0,
              expense: 0,
            };
          }

          groups[key].items.push(tx);

          const amount = Number(tx.amount) || 0;

          if (tx.categoryType === "income") groups[key].income += amount;
          else groups[key].expense += amount;
        });

        setGrouped(groups);
        setLoading(false);
      },
      (err) => {
        console.error("Gagal load transaksi (realtime):", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, month]);

  // tutup menu saat klik di luar
  useEffect(() => {
    if (!openMenuId) return;

    const handler = (e) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target)
      ) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenuId]);

  const handleMenuToggle = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleEditClick = (e, tx) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onEdit?.(tx);
  };

  const handleDeleteClick = async (e, tx) => {
    e.stopPropagation();
    if (!confirm("Yakin hapus transaksi?")) return;

    try {
      await deleteDoc(doc(db, "users", user.id, "transactions", tx.id));
      setOpenMenuId(null);
      // ⬇️ GAK PERLU reload manual, onSnapshot akan otomatis kepanggil
    } catch (err) {
      alert("Gagal menghapus transaksi.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-sm animate-pulse">
          Memuat transaksi...
        </div>
      </div>
    );
  }

  if (!transactions.length) {
    return (
      <div className="text-center py-20 bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-2xl">
        <div className="text-gray-400 text-lg mb-2">📝</div>
        <p className="text-gray-500 text-sm">Belum ada catatan di bulan ini</p>
      </div>
    );
  }

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b) - new Date(a)
  );

  return (
    <div ref={menuContainerRef} className="space-y-6">
      {sortedDates.map((dateKey) => {
        const g = grouped[dateKey];

        const dateLabel = g.dateObj.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const dailyBalance = g.income - g.expense;

        return (
          <div
            key={dateKey}
            className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 group"
          >
            {/* Date Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
              <div className="font-semibold text-white text-lg">
                {dateLabel}
              </div>
              <div
                className={`font-bold text-xl ${
                  dailyBalance >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatRupiah(dailyBalance)}
              </div>
            </div>

            {/* Transactions */}
            <div className="space-y-3">
              {g.items.map((tx) => {
                const isIncome = tx.categoryType === "income";

                return (
                  <div
                    key={tx.id}
                    className="group/transaction flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 transition-all duration-200 cursor-pointer"
                    onClick={() => onEdit?.(tx)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white text-sm truncate mb-1">
                        {tx.categoryName}
                      </div>
                      {tx.note && (
                        <div className="text-gray-400 text-xs truncate">
                          {tx.note}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      <span
                        className={`font-semibold text-sm ${
                          isIncome ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {formatRupiah(tx.amount)}
                      </span>

                      <div className="relative">
                        <button
                          onClick={(e) => handleMenuToggle(e, tx.id)}
                          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                        >
                          <EllipsisVertical size={18} />
                        </button>

                        {openMenuId === tx.id && (
                          <div className="absolute top-full right-0 mt-2 w-32 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-xl shadow-2xl z-50 py-1">
                            <button
                              onClick={(e) => handleEditClick(e, tx)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(e, tx)}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
