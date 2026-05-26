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
          {/* Mobile block — hidden on desktop via CSS, shown on screens < 1024px */}
          <div className="mobileBlock">
            <div className="mobileBlockIcon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h1 className="mobileBlockTitle">Desktop Only</h1>
            <p className="mobileBlockText">
              The CareConnect Admin Portal is designed for desktop use. Please open this page on a computer for the best experience.
            </p>
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
