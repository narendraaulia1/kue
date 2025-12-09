"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { Plus, Edit3, Trash2, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

export default function CategoryManager() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [showListModal, setShowListModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [type, setType] = useState("expense");
  const [editingId, setEditingId] = useState(null);
  const [categoryTab, setCategoryTab] = useState("expense");

  // Realtime categories
  useEffect(() => {
    if (!user) return;

    const ref = collection(db, "users", user.id, "categories");
    const unsub = onSnapshot(ref, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(list);
    });

    return () => unsub();
  }, [user]);

  const resetForm = () => {
    setName("");
    setGroup("");
    setType("expense");
    setEditingId(null);
  };

  const openEditModal = (cat = null) => {
    if (cat) {
      setEditingId(cat.id);
      setName(cat.name || "");
      setGroup(cat.group || "");
      setType(cat.type || "expense");
    } else {
      resetForm();
    }
    setShowEditModal(true);
    setShowListModal(false);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    resetForm();
    setTimeout(() => setEditingId(null), 200);
  };

  const openListModal = () => {
    setShowListModal(true);
  };

  const closeListModal = () => {
    setShowListModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    try {
      if (editingId) {
        // UPDATE
        const ref = doc(db, "users", user.id, "categories", editingId);
        await updateDoc(ref, {
          name: name.trim(),
          group: group.trim(),
          type,
        });
      } else {
        // CREATE
        const newId = uuidv4();
        const ref = doc(db, "users", user.id, "categories", newId);
        await setDoc(ref, {
          id: newId,
          name: name.trim(),
          group: group.trim(),
          type,
          createdAt: serverTimestamp(),
        });
      }
      closeEditModal();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan kategori");
    }
  };

  const handleDelete = async (id) => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.id, "categories", id);
      await deleteDoc(ref);
      if (editingId === id) closeEditModal();
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus kategori");
    }
  };

  // Filter categories by tab
  const filteredCategories = categories.filter(c => c.type === categoryTab);
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const groupName = cat.group?.trim() || "Tanpa Grup";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {});
  const sortedGroups = Object.keys(groupedCategories).sort();

  return (
    <div className="w-full">
      {/* Main Category Button */}
      <button
        onClick={openListModal}
        className="w-full py-4 px-6 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-2 border-slate-600/50 hover:border-slate-500 hover:from-slate-700 hover:to-slate-600 text-slate-300 hover:text-white font-semibold rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-slate-400/20 text-sm"
      >
        <Plus size={20} />
        Kelola Kategori
      </button>

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={closeListModal}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-md max-h-[90vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-800/50 sticky top-0 bg-slate-900/95 z-10 rounded-t-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Kelola Kategori</h3>
                <button
                  onClick={closeListModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Add Button Inside Modal */}
              <button
                onClick={() => openEditModal()}
                className="w-full py-3.5 px-5 bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-400/50 text-emerald-400 hover:text-emerald-300 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mb-6 shadow-md hover:shadow-emerald-400/20"
              >
                <Plus size={18} />
                Tambah Kategori Baru
              </button>

              {/* Category Tabs */}
              <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl mb-6 overflow-hidden">
                <button
                  onClick={() => setCategoryTab("income")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    categoryTab === "income"
                      ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <ChevronLeft size={16} />
                  Pemasukan
                </button>
                <button
                  onClick={() => setCategoryTab("expense")}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    categoryTab === "expense"
                      ? "bg-red-500/20 text-red-400 border-b-2 border-red-400"
                      : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  Pengeluaran
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Grouped Categories List */}
              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
                {sortedGroups.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm bg-slate-800/30 rounded-2xl border border-slate-700/30">
                    Belum ada kategori {categoryTab === "income" ? "pemasukan" : "pengeluaran"}
                  </div>
                ) : (
                  sortedGroups.map((groupName) => (
                    <div key={groupName}>
                      <div className="px-4 py-2.5 text-xs font-semibold text-slate-300 uppercase tracking-wider bg-slate-800/50 rounded-xl mb-3">
                        {groupName}
                      </div>
                      <div className="space-y-2">
                        {groupedCategories[groupName].map((cat) => (
                          <div
                            key={cat.id}
                            className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600 hover:shadow-sm transition-all duration-200 flex items-center justify-between cursor-pointer"
                            onClick={() => openEditModal(cat)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-white text-base truncate">{cat.name}</div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                <span className={`px-2.5 py-1 rounded-full font-medium ${
                                  cat.type === "income" 
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-400/50" 
                                    : "bg-red-500/20 text-red-400 border border-red-400/50"
                                }`}>
                                  {cat.type === "income" ? "Pemasukan" : "Pengeluaran"}
                                </span>
                                {cat.group && (
                                  <span className="text-slate-500">• {cat.group}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-all duration-200 ml-4 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(cat);
                                }}
                                className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm"
                                title="Edit"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(cat.id);
                                }}
                                className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 flex-shrink-0 shadow-sm"
                                title="Hapus"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={closeEditModal}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-sm max-h-[85vh] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-800/50 sticky top-0 bg-slate-900/95 z-10 rounded-t-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingId ? "Edit Kategori" : "Tambah Kategori"}
                </h3>
                <button
                  onClick={closeEditModal}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Nama Kategori</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-5 py-4 bg-slate-800/50 border-2 border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-500 transition-all duration-200 text-base font-medium"
                    placeholder="Contoh: Makanan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Grup (opsional)</label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-800/50 border-2 border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/50 focus:border-slate-500 transition-all duration-200 text-base"
                    placeholder="Contoh: Shopping"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Jenis Kategori</label>
                  <div className="flex bg-slate-800/50 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setType("income")}
                      className={`flex-1 py-4 px-6 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        type === "income"
                          ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400 shadow-emerald-500/20"
                          : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      <ChevronLeft size={18} />
                      Pemasukan
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={`flex-1 py-4 px-6 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        type === "expense"
                          ? "bg-red-500/20 text-red-400 border-b-2 border-red-400 shadow-red-500/20"
                          : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      }`}
                    >
                      Pengeluaran
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-4.5 px-8 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-3 text-base"
                  >
                    <Check size={20} />
                    {editingId ? "Simpan Perubahan" : "Tambah Kategori"}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-8 py-4.5 bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700 text-slate-300 hover:text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg text-base"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-red-500/30 rounded-2xl w-full max-w-sm p-8 shadow-2xl max-w-xs mx-auto text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-red-500/20 border-4 border-red-400/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trash2 size={40} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Hapus Kategori?</h3>
            <p className="text-base text-slate-300 mb-8 max-w-sm mx-auto leading-relaxed">
              Kategori ini akan dihapus permanen dan tidak bisa dikembalikan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-4 px-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 flex items-center justify-center gap-2 text-base"
              >
                <Trash2 size={18} />
                Hapus
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700 text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-200 shadow-lg text-base"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
