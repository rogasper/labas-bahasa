import { Link } from "@tanstack/react-router";
import { Button } from "@labas/ui/components/button";
import { Card, CardContent } from "@labas/ui/components/card";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { useState } from "react";

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

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--warm-cream)] flex flex-col font-sans selection:bg-[var(--matcha-300)] selection:text-[var(--clay-black)]">
      {/* Navbar */}
      <nav className="w-full px-6 py-4 md:px-12 lg:px-16 flex items-center justify-between max-w-7xl mx-auto z-50 sticky top-0 bg-[var(--warm-cream)] border-b-2 border-[var(--oat-border)]">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Labas Logo" className="h-10 w-auto object-contain" />
          <span className="font-headline font-semibold text-2xl tracking-[-0.64px] text-[var(--clay-black)] hidden sm:block">Labas</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="https://saweria.co/rogasper" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-charcoal)] hover:text-[var(--pomegranate-400)] transition-colors p-2 hidden md:flex items-center gap-2" aria-label="Support via Saweria">
            <MaterialIcon name="favorite" className="text-xl" />
            <span className="font-semibold text-base">Support</span>
          </a>
          <a href="https://github.com/rogasper/labas-bahasa" target="_blank" rel="noopener noreferrer" className="text-[var(--warm-charcoal)] hover:text-[var(--clay-black)] transition-colors p-2 hidden sm:flex items-center gap-2" aria-label="GitHub Repository">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-semibold text-base">Star us</span>
          </a>
          <div className="w-px h-6 bg-[var(--oat-border)] hidden sm:block mx-2"></div>
          <Link to="/login">
            <Button variant="ghost" className="text-[var(--clay-black)] font-semibold hover:bg-[var(--oat-light)] rounded-[12px] text-lg px-4 sm:px-6 h-12">
              Masuk
            </Button>
          </Link>
          <Link to="/login">
            <Button className="bg-[var(--clay-black)] text-[var(--pure-white)] hover:bg-[var(--dark-charcoal)] rounded-[24px] h-12 px-6 sm:px-8 font-semibold text-lg clay-hover clay-shadow">
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
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center xl:justify-start pt-6">
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-[var(--pure-white)] text-[var(--clay-black)] rounded-[24px] h-[64px] px-8 text-xl font-semibold border-2 border-[var(--oat-border)] clay-shadow clay-hover">
                  Mulai Latihan Sekarang
                </Button>
              </Link>
              <a href="https://github.com/rogasper/labas-bahasa" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button variant="ghost" className="w-full sm:w-auto text-[var(--clay-black)] rounded-[24px] h-[64px] px-8 text-xl font-semibold hover:bg-[var(--oat-light)] border-2 border-transparent flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  Lihat di GitHub
                </Button>
              </a>
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

        {/* VIDEO DEMO SECTION - DYNAMIC ZIGZAG */}
        <section id="demo" className="w-full bg-[var(--warm-cream)] py-20 pb-32 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-40 -left-64 w-[500px] h-[500px] bg-[var(--matcha-300)]/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-40 -right-64 w-[600px] h-[600px] bg-[var(--slushie-500)]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-24 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ube-300)]/30 border-2 border-[var(--ube-300)] text-[var(--ube-800)] uppercase-label shadow-sm">
                <MaterialIcon name="play_circle" className="text-sm" />
                <span>Lihat Aksinya</span>
              </div>
              <h2 className="text-[50px] md:text-[60px] font-headline font-semibold text-[var(--clay-black)] tracking-[-2.4px] leading-tight drop-shadow-sm">
                Pengalaman Belajar Generasi Baru
              </h2>
            </div>

            <div className="space-y-32">
              {/* Feature 1: Hero Showcase - Generate AI */}
              <div className="flex flex-col items-center text-center pb-8 pt-4">
                <div className="max-w-3xl space-y-5 mb-10">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--ube-300)]/20 border-2 border-[var(--ube-300)]/50 text-[var(--ube-800)] text-sm font-bold tracking-wide uppercase-label mb-2">✨ Fitur Unggulan</div>
                  <h3 className="text-[36px] md:text-[45px] lg:text-[55px] font-headline font-semibold text-[var(--clay-black)] leading-[1.1] tracking-[-1.5px]">
                    Generate Soal <br className="hidden sm:block md:hidden" /> <span className="text-[var(--ube-800)]">Agentic AI</span>
                  </h3>
                  <p className="text-lg md:text-xl text-[var(--warm-charcoal)] leading-relaxed max-w-2xl mx-auto">
                    Masukkan teks bacaan bahasa asing, dan biarkan sistem <i>Multi-step Agentic Pipeline</i> kami (Validasi → Generasi → Self-check) menyusun paket soal bermutu secara otomatis.
                  </p>
                </div>
                
                <div className="w-full relative group max-w-5xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--ube-400)] via-[var(--matcha-300)] to-[var(--lemon-400)] rounded-[48px] transform rotate-1 group-hover:rotate-2 transition-transform duration-700 opacity-60 blur-xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--ube-400)] via-[var(--matcha-300)] to-[var(--lemon-400)] rounded-[48px] transform rotate-1 group-hover:rotate-2 transition-transform duration-700"></div>
                  <div className="relative rounded-[48px] overflow-hidden border-[6px] border-[var(--pure-white)] shadow-[0_30px_80px_rgba(0,0,0,0.2)] bg-[var(--oat-light)] transform transition-transform duration-700 group-hover:-translate-y-2">
                    <video 
                      className="w-full aspect-video object-cover" 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                    >
                      <source src="/generate%20soal.mp4" type="video/mp4" />
                      Browser Anda tidak mendukung tag video.
                    </video>
                  </div>
                  
                  {/* Floating badge 1 */}
                  <div className="absolute -bottom-8 right-4 md:-right-8 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] p-4 md:p-5 rounded-[24px] md:rounded-[28px] shadow-2xl clay-hover transform -rotate-3 z-20 flex items-center gap-3 md:gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[var(--ube-300)] flex items-center justify-center">
                      <MaterialIcon name="smart_toy" className="text-2xl md:text-3xl text-[var(--ube-800)]" />
                    </div>
                    <div className="text-left">
                      <p className="text-base md:text-lg font-bold text-[var(--clay-black)] leading-tight">Agentic Pipeline</p>
                      <p className="text-xs md:text-sm text-[var(--warm-charcoal)]">Generasi & Self-Check</p>
                    </div>
                  </div>
                  
                  {/* Floating badge 2 */}
                  <div className="absolute -top-8 left-4 md:-left-8 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] p-4 rounded-[24px] shadow-2xl clay-hover transform rotate-3 z-20 flex items-center gap-3 hidden md:flex">
                    <div className="w-12 h-12 rounded-full bg-[var(--lemon-400)] flex items-center justify-center">
                      <MaterialIcon name="verified" className="text-2xl text-[var(--lemon-800)]" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[var(--clay-black)] leading-tight">Kualitas Tinggi</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Evaluasi Otomatis</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Zigzag Right - Manajemen Paket */}
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-20">
                <div className="flex-1 w-full lg:w-1/2 relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--matcha-400)] to-[var(--lemon-400)] rounded-[40px] transform -rotate-3 group-hover:-rotate-6 transition-transform duration-700"></div>
                  <div className="relative rounded-[40px] overflow-hidden border-4 border-[var(--pure-white)] shadow-[0_20px_60px_rgba(0,0,0,0.15)] transform transition-transform duration-700 group-hover:-translate-y-2 bg-[var(--oat-light)]">
                    <video 
                      className="w-full aspect-video object-cover" 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                    >
                      <source src="/paket%20soal.mp4" type="video/mp4" />
                      Browser Anda tidak mendukung tag video.
                    </video>
                  </div>
                  
                  {/* Floating badge */}
                  <div className="absolute -top-6 -left-6 md:-left-10 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] p-4 rounded-[24px] shadow-xl clay-hover transform rotate-6 z-20 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--matcha-300)] flex items-center justify-center">
                      <MaterialIcon name="source" className="text-2xl text-[var(--matcha-800)]" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--clay-black)] leading-tight">Bank Soal</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Koleksi Lengkap</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 w-full lg:w-1/2 space-y-6">
                  <h3 className="text-[40px] lg:text-[50px] font-headline font-semibold text-[var(--clay-black)] leading-[1.1] tracking-[-1.5px]">
                    Kustomisasi <br/> <span className="text-[var(--matcha-600)]">Paket Belajar</span>
                  </h3>
                  <p className="text-xl text-[var(--warm-charcoal)] leading-relaxed">
                    Eksplorasi Bank Soal untuk merakit paket latihan Anda sendiri. Publikasikan paket soal buatan Anda, atau gunakan paket pilihan dari daftar Editor's Pick.
                  </p>
                  <ul className="space-y-4 pt-4">
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--matcha-300)]/50 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-[var(--matcha-800)]" />
                      </div>
                      <span className="text-lg font-medium text-[var(--clay-black)]">Bank Soal Terintegrasi</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--matcha-300)]/50 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-[var(--matcha-800)]" />
                      </div>
                      <span className="text-lg font-medium text-[var(--clay-black)]">Sistem Publikasi Paket</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Feature 3: Zigzag Left - Simulasi */}
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                <div className="flex-1 w-full lg:w-1/2 relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[var(--slushie-500)] to-[var(--ube-400)] rounded-[40px] transform rotate-3 group-hover:rotate-6 transition-transform duration-700"></div>
                  <div className="relative rounded-[40px] overflow-hidden border-4 border-[var(--pure-white)] shadow-[0_20px_60px_rgba(0,0,0,0.15)] transform transition-transform duration-700 group-hover:-translate-y-2 bg-[var(--oat-light)]">
                    <video 
                      className="w-full aspect-video object-cover" 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                    >
                      <source src="/attempt%20exam.mp4" type="video/mp4" />
                      Browser Anda tidak mendukung tag video.
                    </video>
                  </div>

                  {/* Floating badge */}
                  <div className="absolute -bottom-6 -right-6 md:-right-10 bg-[var(--pure-white)] border-2 border-[var(--oat-border)] p-4 rounded-[24px] shadow-xl clay-hover transform -rotate-6 z-20 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--slushie-500)] flex items-center justify-center">
                      <MaterialIcon name="timer" className="text-2xl text-[var(--clay-black)]" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--clay-black)] leading-tight">Anti-Curang</p>
                      <p className="text-xs text-[var(--warm-charcoal)]">Validasi Waktu</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 w-full lg:w-1/2 space-y-6">
                  <h3 className="text-[40px] lg:text-[50px] font-headline font-semibold text-[var(--clay-black)] leading-[1.1] tracking-[-1.5px]">
                    Simulasi Ujian <br/> <span className="text-[var(--slushie-600)]">Fokus Penuh</span>
                  </h3>
                  <p className="text-xl text-[var(--warm-charcoal)] leading-relaxed">
                    Kerjakan latihan dengan antarmuka ujian sesungguhnya. Selesaikan tes dengan sistem timer yang tervalidasi secara akurat, dan dapatkan kalkulasi skor serta akurasi secara instan.
                  </p>
                  <ul className="space-y-4 pt-4">
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--slushie-500)]/30 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-[var(--clay-black)]" />
                      </div>
                      <span className="text-lg font-medium text-[var(--clay-black)]">Sistem Timer Tervalidasi</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--slushie-500)]/30 flex items-center justify-center">
                        <MaterialIcon name="check" className="text-[var(--clay-black)]" />
                      </div>
                      <span className="text-lg font-medium text-[var(--clay-black)]">Kalkulasi Skor Otomatis</span>
                    </li>
                  </ul>
                </div>
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
        <div className="flex flex-col items-center gap-4 mb-8">
          <p className="text-[var(--warm-charcoal)] font-semibold text-lg">Hubungi Kami</p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-[var(--clay-black)]">
            <a href="mailto:admin@rogasper.com" className="flex items-center gap-2 hover:text-[var(--matcha-700)] transition-colors">
              <MaterialIcon name="mail" />
              <span className="font-semibold">admin@rogasper.com</span>
            </a>
            <a href="https://instagram.com/rogasper" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--matcha-700)] transition-colors">
              <MaterialIcon name="photo_camera" />
              <span className="font-semibold">@rogasper</span>
            </a>
            <a href="https://github.com/rogasper/labas-bahasa" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--matcha-700)] transition-colors">
              <MaterialIcon name="code" />
              <span className="font-semibold">GitHub</span>
            </a>
            <a href="https://saweria.co/rogasper" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--pomegranate-400)] transition-colors">
              <MaterialIcon name="favorite" />
              <span className="font-semibold">Saweria</span>
            </a>
            <a href="https://ko-fi.com/rogasper" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--pomegranate-400)] transition-colors">
              <MaterialIcon name="local_cafe" />
              <span className="font-semibold">Ko-fi</span>
            </a>
            <a href="https://rogasper.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--matcha-700)] transition-colors">
              <MaterialIcon name="language" />
              <span className="font-semibold">rogasper.com</span>
            </a>
          </div>
        </div>
        <p className="text-[var(--warm-charcoal)] font-semibold text-lg">
          &copy; {new Date().getFullYear()} Labas. Didesain dengan penuh kehangatan.
        </p>
      </footer>
    </div>
  );
}
