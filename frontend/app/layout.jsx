import { AuthProvider } from "../lib/authContext";
import "./globals.css";

export const metadata = {
  title: "Flatmate Expense Manager",
  description: "Smart, debt-simplified expense splitting for roommates and flatmates.",
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
          <main
            style={{
              maxWidth: "880px",
              width: "100%",
              margin: "24px auto",
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
