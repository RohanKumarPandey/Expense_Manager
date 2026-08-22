import { AuthProvider } from "../lib/authContext";
import Navbar from "../components/Navbar";
import "./globals.css";

export const metadata = {
  title: "The Running Tab — Shared Household Ledger",
  description: "A running tab between people who live together. Shared household expenses, receipts, and debt simplification.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main
            style={{
              maxWidth: "960px",
              width: "100%",
              margin: "20px auto 48px auto",
              padding: "0 16px",
            }}
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
