// lib/auth-context.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null); // raw user from Firebase
  const [user, setUser] = useState(null); // user from Firestore
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);

      // ❌ Tidak login
      if (!u) {
        setUser(null);
        setLoading(false);
        return;
      }

      // ❌ Email belum diverifikasi
      if (!u.emailVerified) {
        console.warn("Email belum diverifikasi:", u.email);
        
        // opsional: auto logout supaya tidak 'nyangkut'
        await signOut(auth);

        setUser(null);
        setLoading(false);
        return;
      }

      // ------------------------------------------------
      // ✔ Email sudah verifikasi → lanjut ambil Firestore
      // ------------------------------------------------

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Buat user baru di Firestore
        await setDoc(ref, {
          id: u.uid,
          email: u.email || "",
          name: u.displayName || "",
          role: "user",
          provider: u.providerData?.[0]?.providerId || "",
          createdAt: serverTimestamp(),
        });

        setUser({
          id: u.uid,
          email: u.email || "",
          name: u.displayName || "",
          role: "user",
        });
      } else {
        // Pakai data Firestore
        setUser({
          id: u.uid,
          ...snap.data(),
        });
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
