import type { Metadata } from "next";
import { Outfit, Cinzel, Fredoka } from "next/font/google";
import Navbar from "@/components/Navbar";
import Companion from "@/components/Companion";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeController from "@/components/ThemeController";
import { UserProvider } from "@/context/UserContext";
import OnboardingForm from "@/components/OnboardingForm";
import {
  ClerkProvider,
  SignedIn,
  UserButton,
} from "@clerk/nextjs";
import OnboardingGuide from "@/components/OnboardingGuide";
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
  description: "Personal Sanctuary",
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
          <UserProvider>
            <header className="absolute top-6 right-24 z-50 flex gap-4 p-2 rounded-lg text-white">
              <SignedIn>
                <UserButton />
              </SignedIn>
            </header>
            <ThemeProvider>
              <ThemeController />
              {children}
              <Companion />
              <Navbar />
              <OnboardingForm />
              <SignedIn>
                <OnboardingGuide />
              </SignedIn>
            </ThemeProvider>
          </UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
