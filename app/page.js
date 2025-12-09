"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  updateProfile,
  linkWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot, // ⬅️ realtime listener
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "../lib/auth-context";
import { auth, db, googleProvider } from "../lib/firebase";

import MonthTabs from "../components/MonthTabs";
import TransactionList from "../components/TransactionList";
import TransactionForm from "../components/TransactionForm";
import {
  Loader2,
  Plus,
  X,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  AlertCircle,
} from "lucide-react";

function formatRupiah(num) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num || 0);
}

function generateMonths(count = 6) {
  const now = new Date();
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${year}-${month}`;
    const label = d.toLocaleDateString("id-ID", {
      month: "short",
      year: "numeric",
    });
    result.push({ value, label });
  }
  return result;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading, firebaseUser } = useAuth();

  const [months] = useState(() => generateMonths(6));
  const [selectedMonth, setSelectedMonth] = useState(
    months.length > 0 ? months[0].value : ""
  );
  const [showForm, setShowForm] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catGroup, setCatGroup] = useState("");
  const [catType, setCatType] = useState("expense");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryTab, setCategoryTab] = useState("expense");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmPasswordModal, setShowConfirmPasswordModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const profileMenuRef = useRef(null);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [snackbar, setSnackbar] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Snackbar handlers
  const showSnackbar = (message, type = "success") => {
    setSnackbar({ show: true, message, type });
    setTimeout(
      () => setSnackbar({ show: false, message: "", type: "success" }),
      3000
    );
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Google linked?
  useEffect(() => {
    if (!firebaseUser) {
      setIsGoogleLinked(false);
      return;
    }
    const linked = firebaseUser.providerData.some(
      (p) => p.providerId === "google.com"
    );
    setIsGoogleLinked(linked);
  }, [firebaseUser]);

  // Close profile menu on outside click
  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  // Load categories (masih pakai getDocs, gapapa)
  const loadCategories = useCallback(async () => {
    if (!user) return;
    try {
      const ref = collection(db, "users", user.id, "categories");
      const snap = await getDocs(ref);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(list);
    } catch (err) {
      console.error("Gagal load kategori:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user, loadCategories]);

  // 🔴 REALTIME SUMMARY LISTENER
  useEffect(() => {
    if (!user || !selectedMonth) return;

    const ref = collection(db, "users", user.id, "transactions");

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        let totalIncome = 0;
        let totalExpense = 0;

        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data.date) return;

          const dateObj = data.date.toDate
            ? data.date.toDate()
            : new Date(data.date);

          if (Number.isNaN(dateObj.getTime())) return;

          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const ym = `${year}-${month}`;

          const amount = Number(data.amount) || 0;

          if (data.categoryType === "income") {
            totalIncome += amount;
          } else if (data.categoryType === "expense") {
            totalExpense += amount;
          }

          if (ym === selectedMonth) {
            if (data.categoryType === "income") {
              monthlyIncome += amount;
            } else if (data.categoryType === "expense") {
              monthlyExpense += amount;
            }
          }
        });

        setSummary({
          income: monthlyIncome,
          expense: monthlyExpense,
          balance: totalIncome - totalExpense,
        });
      },
      (err) => {
        console.error("Gagal listen transaksi:", err);
      }
    );

    return () => unsubscribe();
  }, [user, selectedMonth]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  if (!user) return null;

  const displayName =
    user?.name || (user?.email ? user.email.split("@")[0] : "User");
  const initial = displayName.charAt(0).toUpperCase();

  // Updated handlers
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout gagal:", err);
      showSnackbar("Logout gagal", "error");
    }
  };

  const handleEditName = () => {
    setNewName(displayName);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    if (!auth.currentUser || !user) return;
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      const ref = doc(db, "users", user.id);
      await setDoc(ref, { name: newName.trim() }, { merge: true });
      showSnackbar("Nama berhasil diperbarui");
      setShowEditNameModal(false);
      setNewName("");
    } catch (err) {
      console.error("Gagal update nama:", err);
      showSnackbar("Gagal memperbarui nama", "error");
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handleConfirmNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      showSnackbar("Password konfirmasi tidak cocok", "error");
      return;
    }
    if (newPassword.length < 6) {
      showSnackbar("Password minimal 6 karakter", "error");
      return;
    }
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await updatePassword(auth.currentUser, newPassword);
      showSnackbar("Password berhasil diganti");
      setShowConfirmPasswordModal(false);
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Gagal ganti password:", err);
      if (err.code === "auth/wrong-password") {
        showSnackbar("Password saat ini salah", "error");
      } else if (err.code === "auth/requires-recent-login") {
        showSnackbar("Silakan login ulang untuk keamanan", "error");
      } else {
        showSnackbar("Gagal mengganti password", "error");
      }
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      showSnackbar("Email user tidak ditemukan", "error");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      showSnackbar(`Email reset dikirim ke ${user.email}`);
    } catch (err) {
      console.error("Gagal kirim email reset:", err);
      showSnackbar("Gagal mengirim email reset password", "error");
    }
  };

  const handleOpenSettings = () => {
    router.push("/settings");
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) {
      showSnackbar("Harus login dulu", "error");
      return;
    }
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
      setIsGoogleLinked(true);
      showSnackbar("Berhasil menghubungkan Google");
    } catch (err) {
      console.error("Gagal menghubungkan Google:", err);
      if (
        err.code === "auth/credential-already-in-use" ||
        err.code === "auth/account-exists-with-different-credential"
      ) {
        showSnackbar(
          "Akun Google sudah terhubung ke akun lain",
          "error"
        );
      } else {
        showSnackbar("Gagal menghubungkan Google", "error");
      }
    }
  };

  const openCategoryModal = () => {
    setEditingCategory(null);
    setShowAddCategoryForm(false);
    setCatName("");
    setCatGroup("");
    setCatType("expense");
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!user || !catName.trim()) return;
    try {
      const id = editingCategory?.id || uuidv4();
      const ref = doc(db, "users", user.id, "categories", id);
      await setDoc(ref, {
        id,
        name: catName.trim(),
        group: catGroup.trim(),
        type: catType,
      });
      setShowAddCategoryForm(false);
      setEditingCategory(null);
      setCatName("");
      setCatGroup("");
      setCatType("expense");
      await loadCategories();
      showSnackbar(
        editingCategory ? "Kategori diperbarui" : "Kategori ditambahkan"
      );
    } catch (err) {
      console.error("Gagal simpan kategori:", err);
      showSnackbar("Gagal menyimpan kategori", "error");
    }
  };

  const handleEditCategoryClick = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name || "");
    setCatGroup(cat.group || "");
    setCatType(cat.type || "expense");
    setShowAddCategoryForm(true);
  };

  const handleDeleteCategory = async (cat) => {
    if (!user) return;
    const ok = confirm(`Hapus kategori "${cat.name}"?`);
    if (!ok) return;
    try {
      const ref = doc(db, "users", user.id, "categories", cat.id);
      await deleteDoc(ref);
      await loadCategories();
      showSnackbar("Kategori dihapus");
    } catch (err) {
      console.error("Gagal hapus kategori:", err);
      showSnackbar("Gagal menghapus kategori", "error");
    }
  };

  // Filter and group categories
  const filteredCategories = categories.filter((c) => c.type === categoryTab);
  const groupedCategories = filteredCategories.reduce((acc, cat) => {
    const groupName = cat.group?.trim() || "Tanpa Grup";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {});
  const sortedGroups = Object.keys(groupedCategories).sort();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Snackbar */}
      {snackbar.show && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[100] transform transition-all duration-300 ${
            snackbar.show
              ? "translate-y-0 opacity-100"
              : "-translate-y-2 opacity-0"
          }`}
        >
          <div
            className={`px-6 py-3 rounded-2xl shadow-2xl border max-w-sm w-full mx-4 flex items-center gap-3 ${
              snackbar.type === "success"
                ? "bg-emerald-500/95 backdrop-blur-xl border-emerald-400/50 text-white"
                : "bg-red-500/95 backdrop-blur-xl border-red-400/50 text-white"
            }`}
          >
            {snackbar.type === "success" ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm flex-1">
              {snackbar.message}
            </span>
          </div>
        </div>
      )}

      {/* Profile Header - Fixed Top */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-lg font-semibold text-white">Kue</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={openCategoryModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors duration-200"
            >
              <Plus size={16} />
              <span>Kategori</span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-1.5 p-2 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/70 rounded-xl transition-all duration-200 w-10 h-10"
              >
                <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-white border border-slate-600/50">
                  {initial}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 shadow-xl z-50 max-h-80 overflow-y-auto">
                  <div className="mb-3 pb-2 border-b border-slate-700/50">
                    <div className="font-medium text-white text-sm mb-1 truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {user.email}
                    </div>
                    <div className="text-xs mt-2 flex items-center gap-1">
                      {isGoogleLinked ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <User size={12} /> Google
                        </span>
                      ) : (
                        <button
                          onClick={handleLinkGoogle}
                          className="text-blue-400 hover:text-blue-300 text-xs underline"
                        >
                          Hubungkan Google
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <button
                      onClick={handleEditName}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors duration-150"
                    >
                      Edit Nama
                    </button>
                    <button
                      onClick={handleChangePassword}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors duration-150"
                    >
                      Ganti Password
                    </button>
                    <button
                      onClick={handleSendResetEmail}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors duration-150"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={handleOpenSettings}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-700/50 text-slate-300 hover:text-white transition-colors duration-150"
                    >
                      Settings
                    </button>
                    <hr className="border-slate-700/50 my-1.5" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg font-medium transition-all duration-150"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Content Header - Balance + MonthTabs */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-[72px] z-30 px-4 pt-4 pb-3 max-w-md mx-auto">
        {/* Balance Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-4 mb-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Saldo Keseluruhan
          </div>
          <div
            className={`text-lg font-bold mb-2 ${
              summary.balance >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatRupiah(summary.balance)}
          </div>
          <div className="grid grid-cols-2 text-xs text-slate-400 gap-2">
            <div>Pemasukan</div>
            <div className="text-right font-medium text-emerald-400">
              {formatRupiah(summary.income)}
            </div>
            <div>Pengeluaran</div>
            <div className="text-right font-medium text-red-400">
              {formatRupiah(summary.expense)}
            </div>
          </div>
        </div>

        {/* Month Tabs */}
        <MonthTabs value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Scrollable Transaction List */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 max-w-md mx-auto">
        <TransactionList
          month={selectedMonth}
          onEdit={(tx) => {
            setEditTransaction(tx);
            setShowForm(true);
          }}
        />
      </div>

      {/* Fixed FAB - Center Bottom */}
      <button
        onClick={() => {
          setEditTransaction(null);
          setShowForm(true);
        }}
        className="fixed left-1/2 -translate-x-1/2 bottom-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-emerald-400/30 border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={20} />
      </button>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] flex items-center justify-center p-4"
          onClick={() => setShowEditNameModal(false)}
        >
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl max-w-xs mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Edit Nama</h3>
              <button
                onClick={() => setShowEditNameModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Baru
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Masukkan nama baru"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveName}
                  disabled={!newName.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Simpan
                </button>
                <button
                  onClick={() => setShowEditNameModal(false)}
                  className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowForm(false);
            setEditTransaction(null);
          }}
        >
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <TransactionForm
              initialData={editTransaction}
              onClose={() => {
                setShowForm(false);
                setEditTransaction(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[49] flex items-center justify-center p-4"
          onClick={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
            setShowAddCategoryForm(false);
          }}
        >
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-md max-h-[85vh] shadow-2xl flex flex-col max-w-sm mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800/50 sticky top-0 bg-slate-900/95 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Kelola Kategori
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setShowAddCategoryForm(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              {showAddCategoryForm ? (
                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 focus:border-slate-600 transition-all duration-200 text-sm"
                      placeholder="Makanan"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Grup (opsional)
                    </label>
                    <input
                      type="text"
                      value={catGroup}
                      onChange={(e) => setCatGroup(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 focus:border-slate-600 transition-all duration-200 text-sm"
                      placeholder="Shopping"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Jenis
                    </label>
                    <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setCatType("income")}
                        className={`flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                          catType === "income"
                            ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                            : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        <ChevronLeft size={14} />
                        Pemasukan
                      </button>
                      <button
                        type="button"
                        onClick={() => setCatType("expense")}
                        className={`flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                          catType === "expense"
                            ? "bg-red-500/20 text-red-400 border-b-2 border-red-400"
                            : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        }`}
                      >
                        Pengeluaran
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-emerald-400/20"
                    >
                      {editingCategory ? "Simpan" : "Tambah Kategori"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategoryForm(false);
                        setEditingCategory(null);
                        setCatName("");
                        setCatGroup("");
                        setCatType("expense");
                      }}
                      className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddCategoryForm(true)}
                  className="w-full py-3 px-4 bg-slate-800/50 hover:bg-slate-700 border-2 border-dashed border-slate-600 text-slate-400 hover:text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:border-slate-500 text-sm"
                >
                  <Plus size={16} />
                  Tambahkan Kategori
                </button>
              )}
            </div>

            <div className="flex-1 overflow-hidden p-2">
              {/* Category Tabs */}
              <div className="flex bg-slate-800/50 border border-slate-700 rounded-xl mb-3 overflow-hidden sticky top-0 z-10 bg-slate-900/95 pb-2">
                <button
                  onClick={() => setCategoryTab("income")}
                  className={`flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    categoryTab === "income"
                      ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                >
                  <ChevronLeft size={14} />
                  Pemasukan
                </button>
                <button
                  onClick={() => setCategoryTab("expense")}
                  className={`flex-1 py-2 px-3 text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
                    categoryTab === "expense"
                      ? "bg-red-500/20 text-red-400 border-b-2 border-red-400"
                      : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                  }`}
                >
                  Pengeluaran
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Grouped Categories */}
              <div className="space-y-2 max-h-[calc(85vh-300px)] overflow-y-auto">
                {sortedGroups.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Belum ada kategori{" "}
                    {categoryTab === "income" ? "pemasukan" : "pengeluaran"}
                  </div>
                ) : (
                  sortedGroups.map((groupName) => (
                    <div key={groupName}>
                      <div className="px-3 py-1.5 text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        {groupName}
                      </div>
                      <div className="space-y-1.5">
                        {groupedCategories[groupName].map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-800/70 cursor-pointer transition-all duration-200 hover:border-slate-600 hover:shadow-sm group"
                            onClick={() => handleEditCategoryClick(cat)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white text-sm truncate">
                                {cat.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded-full font-medium ${
                                    cat.type === "income"
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-red-500/20 text-red-400"
                                  }`}
                                >
                                  {cat.type === "income"
                                    ? "Pemasukan"
                                    : "Pengeluaran"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 lg:opacity-100 lg:gap-2 transition-all duration-200 flex-shrink-0 ml-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCategoryClick(cat);
                                }}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-200 flex-shrink-0"
                                title="Edit"
                              >
                                <MoreVertical size={18} />
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

      {/* Password Modal - Smaller & Compact */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[51] flex items-center justify-center p-4"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-sm p-5 shadow-2xl max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">
                Ganti Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password Saat Ini (opsional)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Kosongkan jika tidak ada"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <button
                onClick={() => {
                  if (newPassword.length < 6) {
                    showSnackbar("Password minimal 6 karakter", "error");
                    return;
                  }
                  setShowPasswordModal(false);
                  setShowConfirmPasswordModal(true);
                }}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 text-sm"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmPasswordModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[52] flex items-center justify-center p-4"
          onClick={() => setShowConfirmPasswordModal(false)}
        >
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl w-full max-w-sm p-5 shadow-2xl max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-white">
                Konfirmasi Password
              </h3>
              <button
                onClick={() => setShowConfirmPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Ketik Ulang Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Ketik ulang password baru"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirmNewPassword}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 text-sm"
                >
                  Ganti Password
                </button>
                <button
                  onClick={() => {
                    setShowConfirmPasswordModal(false);
                    setShowPasswordModal(true);
                  }}
                  className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
