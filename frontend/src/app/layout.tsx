import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/ui/AppShell";
import ThreeDBackground from "@/components/ui/three-d-background";

export const metadata: Metadata = {
  title: "FounderOS | Executive Operations Center",
  description: "AI-powered executive board that evaluates startups in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Living aurora background */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
          <div className="aurora-orb aurora-orb-4" />
          <div className="aurora-noise" />
        </div>
        
        {/* Kinetic 3D background layer */}
        <ThreeDBackground />
        
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

