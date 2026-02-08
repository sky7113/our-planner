import type { Metadata } from "next";
import { Outfit, Cinzel, Fredoka } from "next/font/google";
import Navbar from "@/components/Navbar";
import Companion from "@/components/Companion";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeController from "@/components/ThemeController";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: 'swap',
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "The Butterfly Mansion",
  description: "Raksha's Personal HQ",
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${cinzel.variable} ${fredoka.variable} antialiased`}
      >
        <ThemeProvider>
          <ThemeController />
          {children}
          <Companion />
          <Navbar />
        </ThemeProvider>
      </body>
    </html>
  );
}
