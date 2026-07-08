import type { Metadata } from "next";

import { APP } from "@/config/constants";

import "./globals.css";

export const metadata: Metadata = {
  title: APP.name,
  description: "Operação profissional para restaurantes, cafés e lanchonetes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
