// app/register/page.js
"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "../../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image"; // ← IMPORT LOGO

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Password konfirmasi tidak cocok.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await sendEmailVerification(userCredential.user);

      setError("Registrasi berhasil. Cek email kamu untuk verifikasi akun.");

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Register gagal. Mungkin email sudah dipakai.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      await signInWithPopup(auth, googleProvider);
      router.push("/");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/account-exists-with-different-credential") {
        setError("Akun sudah terdaftar dengan metode login lain.");
      } else {
        setError("Registrasi Google gagal.");
      }
    } finally {
      setIsSubmitting(false);
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

        {/* LOGO HEADER */}
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
          <p className="text-gray-400 text-sm">Buat akun baru</p>
        </div>

        {/* Error / Info Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-4 mb-6">
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
                placeholder="•••••••• (min 6 karakter)"
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

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-gray-700 rounded-xl text-white placeholder-gray-500 pr-12 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all duration-200 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-white/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mendaftar...
              </>
            ) : (
              "Daftar"
            )}
          </button>
        </form>

        {/* Google Register */}
        <button
          onClick={handleGoogleRegister}
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
          Daftar dengan Google
        </button>

        <p className="text-center mt-8 text-xs text-gray-400">
          Sudah punya akun?{" "}
          <a
            href="/login"
            className="text-white hover:text-gray-300 font-medium transition-colors"
          >
            Masuk sekarang
          </a>
        </p>
      </div>
    </div>
  );
}
