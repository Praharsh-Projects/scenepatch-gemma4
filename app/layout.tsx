import type { Metadata, Viewport } from "next";
import "./globals.css";

const publicReplayMode =
  process.env.NEXT_PUBLIC_SCENEPATCH_REPLAY_MODE === "true";
const description = publicReplayMode
  ? "A transparent ScenePatch fixture replay with an executable official-checkpoint Gemma 4 notebook; the Pages UI is not live inference."
  : "A local-first semantic change-control tool for physical creative scenes, built with Gemma 4 E2B.";

export const metadata: Metadata = {
  metadataBase: new URL("https://praharsh-projects.github.io/scenepatch-gemma4/"),
  title: {
    default: "ScenePatch · Git for physical creative setups",
    template: "%s · ScenePatch",
  },
  description,
  applicationName: "ScenePatch",
  manifest: "./manifest.webmanifest",
  icons: {
    icon: "./icon-192.png",
    apple: "./icon-192.png",
  },
  keywords: ["Gemma 4", "WebGPU", "local AI", "creative continuity", "semantic diff"],
  openGraph: {
    type: "website",
    title: "ScenePatch · Git for physical creative setups",
    description: publicReplayMode
      ? "A clearly labeled fixture replay plus an executable official Gemma 4 notebook."
      : "See what changed. Understand what was intended. Commit only when they match.",
    siteName: "ScenePatch",
    images: [
      {
        url: "https://praharsh-projects.github.io/scenepatch-gemma4/og.png",
        width: 1600,
        height: 900,
        alt: "ScenePatch compares before and after art desk scenes and blocks an unexplained change.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScenePatch · Git for physical creative setups",
    description: publicReplayMode
      ? "Transparent fixture replay with an executable Gemma 4 notebook."
      : "Semantic change control for the physical scenes creators build.",
    images: ["https://praharsh-projects.github.io/scenepatch-gemma4/og.png"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0f0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
