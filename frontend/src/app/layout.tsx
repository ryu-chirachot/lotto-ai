import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

import Nav from "@/components/Nav";

import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LottoAI · สถิติหวยไทย & ลาว",
  description: "วิเคราะห์สถิติ ความน่าจะเป็น Markov และ Monte Carlo ของสลากกินแบ่งรัฐบาลและหวยลาวพัฒนา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={plex.variable}>
      <body className="min-h-screen font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-ink-muted sm:px-6">
            <p>
              เว็บไซต์นี้ใช้เพื่อการศึกษาสถิติเท่านั้น ผลการออกรางวัลแต่ละงวดเป็นเหตุการณ์สุ่มที่เป็นอิสระต่อกัน
              ไม่มีโมเดลใดทำนายผลได้แน่นอน และไม่มีกลยุทธ์ใดเอาชนะค่าคาดหวังติดลบของการซื้อสลากได้
            </p>
            <p className="mt-1">
              ข้อมูลหวยไทย: สำนักงานสลากกินแบ่งรัฐบาล (glo.or.th) · ข้อมูลหวยลาว: ข้อมูลจำลอง (ไม่ใช่ผลจริง)
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
