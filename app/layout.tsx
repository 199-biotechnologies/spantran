import type { Metadata } from "next";
import { Crimson_Text } from "next/font/google";
import "./globals.css";

const crimsonText = Crimson_Text({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-crimson",
});

export const metadata: Metadata = {
  title: "CHIMBA Translate - Colombian Spanish AI Translator",
  description: "Colombian Spanish AI translator with street slang, flashcards, and audio playback",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CHIMBA",
  },
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Extends content into safe areas on iPhone
  themeColor: "#EABD56", // Match yellow background
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${crimsonText.variable} font-serif antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
