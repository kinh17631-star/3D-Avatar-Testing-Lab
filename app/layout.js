
import "./globals.css";

export const metadata = {
  title: "Your 3D Avatar Testing Lab",
  description: "A personal 3D avatar testing laboratory."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
