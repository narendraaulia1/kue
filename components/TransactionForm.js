// components/TransactionForm.js
"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "../lib/auth-context";
import { db } from "../lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import {
  Loader2,
  X,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronDown,
} from "lucide-react";

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  })
    .format(num || 0)
    .replace("Rp", "Rp ");
}

// format tampilan di input: "Rp 1.000.000"
function formatAmountDisplay(value) {
  if (!value) return "";
  const numeric = value.replace(/[^\d]/g, "");
  if (!numeric) return "";
  const withDots = numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp ${withDots}`;
}

// format tanggal cantik: "Senin, 9 Desember 2025"
function formatPrettyDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TransactionForm({ initialData, onClose }) {
  const { user } = useAuth();
  const isEdit = !!initialData;

  // simpan di state sebagai angka mentah (string digit saja)
  const [amount, setAmount] = useState(
    initialData?.amount ? String(initialData.amount) : ""
  );
  const [date, setDate] = useState(
    initialData?.date?.toDate
      ? initialData.date.toDate().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [categoryTab, setCategoryTab] = useState("income");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

  const dateInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const ref = collection(db, "users", user.id || user.uid, "categories");
        const snap = await getDocs(ref);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // sort: group A-Z, di dalamnya name A-Z
        list.sort((a, b) => {
          const ga = (a.group || "").toLowerCase();
          const gb = (b.group || "").toLowerCase();
          if (ga < gb) return -1;
          if (ga > gb) return 1;
          const na = (a.name || "").toLowerCase();
          const nb = (b.name || "").toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        });

        setCategories(list);
      } catch (err) {
        console.error("Gagal load kategori:", err);
      }
    })();
  }, [user]);

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (!amount) {
      alert("Jumlah wajib diisi");
      return;
    }
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) {
      alert("Pilih kategori dulu");
      return;
    }

    setSaving(true);
    try {
      const dateObj = new Date(date);

      const payload = {
        amount: Number(amount), // tetap pakai angka mentah
        categoryId: cat.id,
        categoryName: cat.name,
        categoryType: cat.type,
        date: dateObj,
        note,
      };

      if (isEdit) {
        const ref = doc(
          db,
          "users",
          user.id || user.uid,
          "transactions",
          initialData.id
        );
        await setDoc(ref, payload, { merge: true });
      } else {
        const id = uuidv4();
        const ref = doc(db, "users", user.id || user.uid, "transactions", id);
        await setDoc(ref, payload);
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan transaksi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !isEdit) return;
    const ok = confirm("Yakin hapus transaksi ini?");
    if (!ok) return;
    try {
      const ref = doc(
        db,
        "users",
        user.id || user.uid,
        "transactions",
        initialData.id
      );
      await deleteDoc(ref);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus transaksi");
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ====== GROUPING KATEGORI BERDASARKAN GROUP ======
  const activeCategories =
    categoryTab === "income" ? incomeCategories : expenseCategories;

  const groupedCategories = activeCategories.reduce((acc, cat) => {
    const label = (cat.group || "Lainnya").trim() || "Lainnya";
    if (!acc[label]) acc[label] = [];
    acc[label].push(cat);
    return acc;
  }, {});

  const groupNames = Object.keys(groupedCategories);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">
          {isEdit ? "Edit Catatan" : "Tambah Catatan"}
        </h3>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Amount - Rp + pemisah ribuan langsung di input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Jumlah
          </label>
          <div className="relative">
            <input
              type="text"
              value={formatAmountDisplay(amount)} // tampilan: Rp 1.000.000
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setAmount(raw);
              }}
              required
              className="w-full px-4 py-4 bg-black/40 border border-emerald-500/60 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/80 transition-all duration-200 text-xl font-semibold tracking-wide"
              placeholder="Rp 0"
            />
          </div>
        </div>

        {/* Date - satu kartu full bisa di-klik */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tanggal
          </label>

          <button
            type="button"
            onClick={() => {
              if (dateInputRef.current?.showPicker) {
                dateInputRef.current.showPicker();
              } else {
                dateInputRef.current?.focus();
              }
            }}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-black/40 border border-gray-700/80 rounded-xl active:scale-[0.99] transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-gray-400">
                  Tanggal transaksi
                </span>
                <span className="text-sm text-white font-medium">
                  {formatPrettyDate(date) || "Pilih tanggal"}
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
              Ubah
            </span>
          </button>

          {/* input native, disembunyikan tapi tetap dipakai buat picker + value */}
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="sr-only"
          />
        </div>

        {/* Category Tabs + Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">
            Kategori
          </label>

          {/* Tab Buttons */}
          <div className="flex bg-gray-800/50 border border-gray-700 rounded-xl mb-3 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setCategoryTab("income");
                setCategoryId("");
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                categoryTab === "income"
                  ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                  : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
              }`}
            >
              <ArrowLeft size={16} />
              Pemasukan
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryTab("expense");
                setCategoryId("");
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                categoryTab === "expense"
                  ? "bg-red-500/20 text-red-400 border-b-2 border-red-400"
                  : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              Pengeluaran
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Kategori - kartu full, buka bottom sheet */}
          <button
            type="button"
            onClick={() => setCategorySheetOpen(true)}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-black/40 border border-gray-700 rounded-xl active:scale-[0.99] transition-all duration-150"
          >
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-400">Kategori</span>
              <span className="text-sm text-white font-medium">
                {selectedCategory
                  ? `${selectedCategory.name}${
                      selectedCategory.group ? " • " + selectedCategory.group : ""
                    }`
                  : "Pilih kategori"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {!selectedCategory && (
            <p className="mt-1 text-xs text-red-400">
              * Wajib pilih kategori
            </p>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Catatan (opsional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-black/30 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-200 text-sm resize-none"
            placeholder="Deskripsi transaksi..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : isEdit ? (
              "Simpan"
            ) : (
              "Tambah Transaksi"
            )}
          </button>

          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border-2 border-red-500/30 hover:border-red-500/50 bg-transparent/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-medium rounded-xl transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
          >
            Batal
          </button>
        </div>
      </form>

      {/* Bottom Sheet Kategori */}
      {categorySheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-md bg-zinc-900 rounded-t-2xl p-4 pb-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-white">
                Pilih Kategori {categoryTab === "income" ? "Pemasukan" : "Pengeluaran"}
              </h4>
              <button
                type="button"
                onClick={() => setCategorySheetOpen(false)}
                className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300 hover:bg-white/10"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {groupNames.length === 0 && (
                <p className="text-xs text-gray-400">
                  Belum ada kategori untuk tab ini.
                </p>
              )}

              {groupNames.map((groupName) => (
                <div key={groupName} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    {groupName === "Lainnya" ? "Tanpa Grup" : groupName}
                  </p>
                  <div className="space-y-1">
                    {groupedCategories[groupName].map((c) => {
                      const isActive = c.id === categoryId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(c.id);
                            setCategorySheetOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all duration-150 ${
                            isActive
                              ? "bg-emerald-500/20 border border-emerald-400/60 text-emerald-100"
                              : "bg-zinc-800/80 border border-zinc-700 text-gray-100 hover:bg-zinc-700"
                          }`}
                        >
                          <span>{c.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                              Terpilih
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
