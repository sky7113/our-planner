import type { Metadata } from "next";
import { Outfit, Cinzel, Fredoka } from "next/font/google";
import Navbar from "@/components/Navbar";
import Companion from "@/components/Companion";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeController from "@/components/ThemeController";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
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
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${outfit.variable} ${cinzel.variable} ${fredoka.variable} antialiased`}
        >
          <header className="absolute top-4 right-4 z-50 flex gap-4 bg-black/50 p-2 rounded-lg backdrop-blur-sm text-white">
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <ThemeProvider>
            <ThemeController />
            {children}
            <Companion />
            <Navbar />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
