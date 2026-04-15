import { Inter, Roboto } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-family-primary",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-family-secondary",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata = {
  title: "NVCH Admin",
  description: "NVCH Caregiver Admin Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${roboto.variable}`}
        style={{ fontFamily: "var(--font-family-primary), sans-serif" }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
