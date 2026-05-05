import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
  beforeLoad: async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data) {
        throw redirect({ to: "/", replace: true });
      }
    } catch (e) {
      if (e instanceof Response) throw e;
    }
  },
});

function FaqItem({ question, answer, isDark }: { question: string; answer: string; isDark?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`border-b-2 py-6 ${isDark ? 'border-[var(--ube-300)]/30' : 'border-[var(--oat-border)]'} last:border-b-0`}>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left focus:outline-none group"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={`font-headline font-semibold text-2xl tracking-[-0.64px] transition-colors ${isDark ? 'text-[var(--pure-white)] group-hover:text-[var(--ube-300)]' : 'text-[var(--clay-black)] group-hover:text-[var(--matcha-700)]'}`}>
          {question}
        </span>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-180" : ""} ${isDark ? 'border-[var(--ube-300)]/50 text-[var(--pure-white)] group-hover:bg-[var(--ube-300)]/20' : 'border-[var(--oat-border)] text-[var(--clay-black)] group-hover:bg-[var(--oat-light)]'}`}>
          <MaterialIcon
            name="expand_more"
            className="text-2xl"
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 mt-4 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <p className={`text-lg leading-relaxed pr-12 ${isDark ? 'text-[var(--ube-300)]' : 'text-[var(--warm-charcoal)]'}`}>
          {answer}
        </p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--warm-cream)] flex flex-col font-sans selection:bg-[var(--matcha-300)] selection:text-[var(--clay-black)]">
      {/* Navbar */}
      <nav className="w-full px-6 py-4 md:px-12 lg:px-16 flex items-center justify-between max-w-7xl mx-auto z-50 sticky top-0 bg-[var(--warm-cream)] border-b-2 border-[var(--oat-border)]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Labas Logo" className="h-10 w-auto object-contain" />
          <span className="font-headline font-semibold text-2xl tracking-[-0.64px] text-[var(--clay-black)] hidden sm:block">Labas</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-[var(--clay-black)] font-semibold hover:bg-[var(--oat-light)] rounded-[12px] text-lg px-6 h-12">
              Masuk
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--dark-charcoal)] rounded-[24px] h-12 px-8 font-semibold text-lg clay-hover clay-shadow">
              Mulai Gratis
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center overflow-x-hidden">
        {/* HUGE HERO SECTION */}
        <section className="w-full px-6 md:px-12 lg:px-16 pt-16 pb-20 md:pt-24 md:pb-32 flex flex-col xl:flex-row items-center justify-between gap-12 lg:gap-16 relative max-w-[1440px] mx-auto">
          <div className="flex-1 text-center xl:text-left space-y-8 z-10 w-full max-w-[800px] xl:max-w-none">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--matcha-300)] border-2 border-[var(--matcha-800)] text-[var(--clay-black)] uppercase-label shadow-sm mx-auto xl:mx-0 transform -rotate-2">
              <MaterialIcon name="auto_awesome" className="text-sm" />
              <span>Didukung oleh AI Generative</span>
            </div>
            
            <h1 className="text-[50px] md:text-[70px] lg:text-[85px] font-headline font-semibold text-[var(--clay-black)] tracking-[-2.4px] lg:tracking-[-3.2px] leading-[1.0] lg:leading-[0.95] drop-shadow-sm">
              Platform Latihan Bahasa Cerdas.
            </h1>
            
            <p className="text-xl md:text-2xl text-[var(--warm-charcoal)] max-w-2xl mx-auto xl:mx-0 leading-relaxed">
              Persiapkan dirimu untuk ujian bahasa asing dengan latihan soal interaktif, mock test realistis, dan AI Generator super cepat.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center xl:justify-start pt-6">
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[var(--pure-white)] text-[var(--clay-black)] rounded-[24px] h-[64px] px-10 text-xl font-semibold border-2 border-[var(--oat-border)] clay-shadow clay-hover">
                  Mulai Latihan Sekarang
                </Button>
              </Link>
            </div>
          </div>
          
          {/* MASSIVE HERO IMAGE WITH FLOATING ASSETS - SIDE BY SIDE ON DESKTOP */}
          <div className="flex-1 w-full relative group mt-8 xl:mt-0 flex justify-center xl:justify-end">
            <div className="relative w-full max-w-[650px] lg:max-w-[750px]">
              <img 
                src="/hero_img.png" 
                alt="Labas Dashboard Preview" 
                className="w-full h-auto object-contain transform transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-1 drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10"
              />
              {/* Variatif Floating Elements */}
              <div className="absolute -top-8 -left-8 md:-top-12 md:-left-12 w-32 md:w-40 h-auto z-20 hidden sm:block">
                <img src="/generateai.png" alt="floating element" className="w-full h-auto drop-shadow-2xl" />
              </div>
              <div className="absolute -bottom-8 -right-8 md:-bottom-12 md:-right-12 w-40 md:w-48 h-auto z-20 hidden sm:block">
                <img src="/mocktest.png" alt="floating element" className="w-full h-auto drop-shadow-2xl" />
              </div>
              <div className="absolute top-[40%] -left-16 md:-left-24 w-24 md:w-32 h-auto z-0 hidden lg:block opacity-80 blur-[1px]">
                <img src="/progress.png" alt="floating element" className="w-full h-auto drop-shadow-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section id="features" className="w-full bg-[var(--pure-white)] py-32 border-y-2 border-dashed border-[var(--oat-border)]">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
            <div className="text-center max-w-4xl mx-auto mb-24 space-y-6">
              <h2 className="text-[50px] md:text-[60px] font-headline font-semibold text-[var(--clay-black)] tracking-[-2.4px] leading-tight">
                Fitur Unggulan Labas
              </h2>
              <p className="text-2xl text-[var(--warm-charcoal)]">
                Desain yang elegan, namun kokoh untuk mempercepat kesiapan Anda menghadapi ujian.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/generateai.png" alt="AI Generator" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    AI Generator
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Hasilkan soal latihan baru menggunakan AI. Tentukan topik, level kesulitan, dan format dalam hitungan detik.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/latihansoal.png" alt="Latihan Soal" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    Latihan Terfokus
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Akses ribuan soal latihan dari bank soal. Buat paket latihan Anda sendiri dan fokus pada area kelemahan.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/mocktest.png" alt="Mock Test" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    Simulasi Ujian
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Simulasikan suasana ujian sesungguhnya dengan batas waktu, antarmuka imersif, dan penilaian instan.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/progress.png" alt="Progress Tracking" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    Analitik Progres
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Lacak perkembangan nilai Anda dari waktu ke waktu. Analisis mendalam untuk setiap bagian tes bahasa.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/vocabulary.png" alt="Vocabulary" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    Kosakata
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Perkaya kosakata Anda dengan metode cerdas dan pengulangan berkala yang dioptimalkan.
                  </p>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="clay-shadow clay-hover bg-[var(--pure-white)] border-2 border-[var(--oat-border)] rounded-[24px] overflow-hidden group p-4">
                <div className="h-56 w-full flex items-center justify-center p-2">
                  <img src="/diskusi.png" alt="Diskusi" className="h-full w-auto object-contain transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 drop-shadow-lg" />
                </div>
                <CardContent className="p-6">
                  <h3 className="font-headline text-[32px] font-semibold text-[var(--clay-black)] tracking-[-0.64px] mb-3 leading-tight">
                    Forum Diskusi
                  </h3>
                  <p className="text-[var(--warm-charcoal)] text-lg leading-relaxed">
                    Diskusikan soal-soal sulit dengan komunitas pembelajar lainnya dan dapatkan penjelasan ahli.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SWATCH ROOM 1: Ube FAQ Section */}
        <section className="w-full bg-[var(--ube-800)] py-32 rounded-t-[40px] mt-[-40px] z-10 relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t-2 border-[var(--oat-border)]/20">
          <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16">
            <div className="text-center mb-16">
              <h2 className="text-[50px] md:text-[60px] font-headline font-semibold text-[var(--pure-white)] tracking-[-2.4px] mb-6 leading-tight drop-shadow-sm">
                Pertanyaan Umum
              </h2>
              <p className="text-[var(--ube-300)] text-2xl max-w-2xl mx-auto">
                Temukan jawaban cepat untuk pertanyaan seputar Labas.
              </p>
            </div>

            <div className="bg-[var(--ube-900)]/40 backdrop-blur-sm border-2 border-[var(--ube-300)]/30 rounded-[32px] p-8 md:p-12 shadow-2xl">
              <FaqItem 
                isDark
                question="Apa itu Labas?" 
                answer="Labas adalah platform latihan ujian bahasa berbasis AI yang dirancang untuk membantu Anda berlatih dan menguasai bahasa asing melalui simulasi, bank soal interaktif, dan analitik performa." 
              />
              <FaqItem 
                isDark
                question="Bagaimana cara kerja AI Generator?" 
                answer="Fitur AI Generator memungkinkan Anda membuat paket soal baru berdasarkan konteks atau topik tertentu. Anda cukup memasukkan teks acuan, dan AI Agent kami akan memproduksi soal secara otomatis." 
              />
              <FaqItem 
                isDark
                question="Apakah Labas sepenuhnya gratis?" 
                answer="Platform Labas dapat digunakan secara gratis untuk fitur dasar. Untuk fitur generasi soal berbasis AI, kami menggunakan model Bring-Your-Own-Key (BYOK). Anda cukup memasukkan API Key OpenAI Anda." 
              />
              <FaqItem 
                isDark
                question="Bahasa apa saja yang didukung oleh Labas?" 
                answer="Saat ini Labas mendukung latihan untuk berbagai ujian profisiensi bahasa populer seperti Bahasa Inggris (TOEFL, IELTS, TOEIC), Jepang (JLPT), Korea (TOPIK), dan banyak lagi." 
              />
            </div>
          </div>
        </section>

        {/* SWATCH ROOM 2: Matcha CTA Section */}
        <section className="w-full bg-[var(--matcha-800)] py-40 px-6 rounded-t-[40px] mt-[-40px] z-20 relative shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t-2 border-[var(--matcha-600)]">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <h2 className="text-[60px] md:text-[80px] font-headline font-semibold text-[var(--pure-white)] tracking-[-3.2px] leading-[0.95] drop-shadow-md">
              Siap Meningkatkan Skor Anda?
            </h2>
            <p className="text-2xl text-[var(--matcha-300)] max-w-2xl mx-auto">
              Bergabung sekarang dan rasakan perbedaan belajar dengan teknologi yang berpusat pada perkembangan Anda.
            </p>
            <div className="pt-8">
              <Link to="/login" className="inline-block">
                <Button className="bg-[var(--pure-white)] text-[var(--clay-black)] hover:bg-[var(--oat-light)] rounded-[24px] h-[80px] px-14 text-2xl font-bold clay-shadow clay-hover">
                  Daftar Sekarang - Gratis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[var(--pure-white)] py-12 border-t-2 border-[var(--oat-border)] text-center relative z-30">
        <p className="text-[var(--warm-charcoal)] font-semibold text-lg">
          &copy; {new Date().getFullYear()} Labas. Didesain dengan penuh kehangatan.
        </p>
      </footer>
    </div>
  );
}
