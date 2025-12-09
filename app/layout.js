// app/layout.js
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata = {
  title: "Kue - Catat Keuangan",
  description: "Aplikasi pencatat keuangan pribadi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
