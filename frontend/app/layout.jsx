import { AuthProvider } from "../lib/authContext";
import "./globals.css";

export const metadata = {
  title: "Flatmate Expense Manager",
  description: "Manage shared expenses with your flatmates easily.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <main style={{ maxWidth: "850px", margin: "40px auto", padding: "0 20px" }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
