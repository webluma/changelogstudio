import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Changelog Studio",
  description: "Projeto base",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
