import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeWah - Pokemon Card Explorer",
  description: "Explore and learn about Pokemon cards with PokeWah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen flex flex-col`}
        style={{ backgroundColor: '#0f172a' }}
      >
        <div className="flex-grow">
          {children}
        </div>
        <footer className="py-6 mt-10 border-t border-gray-800 bg-gray-900">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-400">
              PokeWah © 2025 by AmjidChan. This product is not connected with or endorsed by The Pokémon Company, Nintendo, or any related organizations.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
