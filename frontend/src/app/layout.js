import { Open_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "GhostGuard — Take control of your digital identity",
  description: "A clearer, privacy-first view of your digital identity.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("ghostguard-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
