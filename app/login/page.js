// app/login/page.js
"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image"; // ← IMPORT IMAGE

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const [info, setInfo] = useState(""); 
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case "auth/user-not-found":
          setError("Akun dengan email ini tidak ditemukan. Coba daftar dulu.");
          break;
        case "auth/wrong-password":
          setError("Password yang kamu masukkan salah. Coba lagi.");
          break;
        case "auth/invalid-email":
          setError("Format email tidak valid.");
          break;
        case "auth/too-many-requests":
          setError(
            "Terlalu banyak percobaan login. Silakan coba lagi nanti atau reset password."
          );
          break;
        default:
          setError("Login gagal. Cek email & password / sudah register belum.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setInfo("");
    setIsSubmitting(true);

    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Popup login ditutup sebelum selesai.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("Ada proses login lain yang sedang berjalan.");
      } else {
        setError("Login Google gagal.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email) {
      setError("Masukkan email dulu di kolom email untuk reset password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("Link reset password telah dikirim ke email kamu.");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("Akun dengan email ini tidak ditemukan.");
      } else if (err.code === "auth/invalid-email") {
        setError("Format email tidak valid.");
      } else {
        setError("Gagal mengirim email reset password. Coba lagi nanti.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">

        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/icon.png"
              alt="Kue Logo"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Kue</h1>
          <p className="text-gray-400 text-sm">Masuk ke akun Anda</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        {/* Info Message */}
        {info && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <p className="text-emerald-300 text-xs">{info}</p>
          </div>
        )}

        {/* FORM LOGIN */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="masukan@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-black/30 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-gray-700 rounded-xl text-white placeholder-gray-500 pr-12 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Lupa Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-white/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menunggu...
              </>
            ) : (
              "Masuk"
            )}
          </button>
        </form>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3 px-6 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white font-medium rounded-xl hover:border-gray-600 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3 text-sm shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Masuk dengan Google
        </button>

        <p className="text-center mt-8 text-xs text-gray-400">
          Belum punya akun?{" "}
          <a
            href="/register"
            className="text-white hover:text-gray-300 font-medium transition-colors"
          >
            Daftar sekarang
          </a>
        </p>
      </div>
    </div>
  );
}
