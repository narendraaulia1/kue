"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import CategoryManager from "../../components/CategoryManager";
import {
  auth,
  db,
  googleProvider,
} from "../../lib/firebase";
import {
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  updateProfile,
  linkWithPopup,
  unlink,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
} from "firebase/firestore";
import { ChevronLeft, X, Loader2, User, Check, AlertCircle, Edit3, Pencil, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const { user, loading, firebaseUser } = useAuth();
  const router = useRouter();
  const [snackbar, setSnackbar] = useState({ show: false, message: "", type: "success" });
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  // Form states
  const [newName, setNewName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: "", type: "success" }), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Logout gagal:", err);
      showSnackbar("Logout gagal", "error");
    }
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    if (!auth.currentUser || !user) return;
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() });
      const ref = doc(db, "users", user.id);
      await setDoc(ref, { name: newName.trim() }, { merge: true });
      showSnackbar("Nama berhasil diperbarui");
      setActiveSection(null);
      setNewName("");
    } catch (err) {
      console.error("Gagal update nama:", err);
      showSnackbar("Gagal memperbarui nama", "error");
    }
  };

  const handleChangePassword = async () => {
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
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await updatePassword(auth.currentUser, newPassword);
      showSnackbar("Password berhasil diganti");
      setActiveSection(null);
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
      setActiveSection(null);
    } catch (err) {
      console.error("Gagal kirim email reset:", err);
      showSnackbar("Gagal mengirim email reset password", "error");
    }
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
      setActiveSection(null);
    } catch (err) {
      console.error("Gagal menghubungkan Google:", err);
      if (err.code === "auth/credential-already-in-use" || err.code === "auth/account-exists-with-different-credential") {
        showSnackbar("Akun Google sudah terhubung ke akun lain", "error");
      } else {
        showSnackbar("Gagal menghubungkan Google", "error");
      }
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!firebaseUser) return;
    try {
      await unlink(firebaseUser, "google.com");
      setIsGoogleLinked(false);
      showSnackbar("Google berhasil dihapus");
      setActiveSection(null);
    } catch (err) {
      console.error("Gagal unlink Google:", err);
      showSnackbar("Gagal menghapus Google", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  );
  if (!user) return null;

  const displayName = user?.name || (user?.email ? user.email.split("@")[0] : "User");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Snackbar */}
      {snackbar.show && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[100] transform transition-all duration-300 ${
          snackbar.show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}>
          <div className={`px-6 py-3 rounded-2xl shadow-2xl border max-w-sm w-full mx-4 flex items-center gap-3 ${
            snackbar.type === 'success' 
              ? 'bg-emerald-500/95 backdrop-blur-xl border-emerald-400/50 text-white' 
              : 'bg-red-500/95 backdrop-blur-xl border-red-400/50 text-white'
          }`}>
            {snackbar.type === 'success' ? (
              <Check size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span className="font-medium text-sm flex-1">{snackbar.message}</span>
          </div>
        </div>
      )}

      {/* Profile Header - Fixed Top */}
      <div className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 p-2 bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all duration-200"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <h1 className="text-lg font-semibold text-white">Pengaturan</h1>
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="px-4 py-6 max-w-md mx-auto pb-20 space-y-6">
        {/* Profile Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-white border border-slate-600/50">
              {initial}
            </div>
            <div>
              <div className="font-medium text-white text-sm mb-1 truncate">{displayName}</div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
            </div>
          </div>

          {/* Settings Buttons */}
          <div className="space-y-2">
            <button 
              onClick={() => setActiveSection(activeSection === 'name' ? null : 'name')}
              className="w-full text-left p-3 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <Edit3 size={16} />
              Edit Nama
            </button>

            <button 
              onClick={() => setActiveSection(activeSection === 'password' ? null : 'password')}
              className="w-full text-left p-3 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <Pencil size={16} />
              Ganti Password
            </button>

            <button 
              onClick={() => setActiveSection(activeSection === 'reset' ? null : 'reset')}
              className="w-full text-left p-3 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <X size={16} />
              Reset Password
            </button>

            <button 
              onClick={() => setActiveSection(activeSection === 'google' ? null : 'google')}
              className="w-full text-left p-3 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 text-slate-300 hover:text-white"
            >
              <User size={16} />
              {isGoogleLinked ? "Hapus Google" : "Hubungkan Google"}
            </button>

            <hr className="border-slate-700/50 my-2" />
            <button 
              onClick={handleLogout}
              className="w-full text-left p-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
            >
              <X size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Dynamic Forms */}
        {activeSection === 'name' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Edit Nama</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nama Baru</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Masukkan nama baru"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveName}
                  disabled={!newName.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Simpan
                </button>
                <button
                  onClick={() => {
                    setActiveSection(null);
                    setNewName("");
                  }}
                  className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'password' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ganti Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password Saat Ini (opsional)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Kosongkan jika tidak ada"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400/50 text-sm"
                  placeholder="Ketik ulang password baru"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleChangePassword}
                  disabled={newPassword.length < 6 || newPassword !== confirmPassword}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  Ganti Password
                </button>
                <button
                  onClick={() => {
                    setActiveSection(null);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'reset' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Reset Password</h3>
            <div className="text-sm text-slate-300 mb-6">
              Email reset password akan dikirim ke <strong>{user.email}</strong>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendResetEmail}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Kirim Email
              </button>
              <button
                onClick={() => setActiveSection(null)}
                className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {activeSection === 'google' && (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Akun Google</h3>
            <div className="text-sm text-slate-300 mb-6">
              {isGoogleLinked 
                ? "Akun Google sudah terhubung. Anda bisa menghapusnya jika tidak ingin menggunakan login Google."
                : "Hubungkan akun Google untuk login lebih mudah."
              }
            </div>
            <div className="flex gap-3">
              <button
                onClick={isGoogleLinked ? handleUnlinkGoogle : handleLinkGoogle}
                className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
                  isGoogleLinked 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isGoogleLinked ? (
                  <>
                    <X size={16} />
                    Hapus Google
                  </>
                ) : (
                  <>
                    <User size={16} />
                    Hubungkan Google
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveSection(null)}
                className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Category Manager Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Kelola Kategori
          </h2>
          <CategoryManager />
        </div>
      </div>
    </div>
  );
}
