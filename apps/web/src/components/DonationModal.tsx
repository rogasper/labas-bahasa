import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@labas/ui/components/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export function DonationModal({
  isOpen,
  onOpenChange,
  triggerAction
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  triggerAction: "exam" | "generate" | null;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)]">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-[var(--pomegranate-400)]/10 rounded-full flex items-center justify-center mb-2">
            <MaterialIcon name="favorite" className="text-4xl text-[var(--pomegranate-400)]" />
          </div>
          <DialogTitle className="text-center text-2xl font-headline font-extrabold text-[var(--clay-black)]">
            Dukung Labas!
          </DialogTitle>
          <DialogDescription className="text-center text-base text-[var(--warm-charcoal)] pt-2 leading-relaxed">
            Selamat, kamu baru saja menyelesaikan {triggerAction === "exam" ? "latihan soal" : "generate soal AI"}! 🎉
            <br/><br/>
            Jika Labas membantumu, dukung kami untuk menutupi biaya server & mengembangkan fitur baru dengan mentraktir kopi. ☕
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <a
            href="https://saweria.co/rogasper"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-[var(--radius-lg)] font-bold transition-all bg-[#F3B63A] text-black hover:brightness-95 clay-shadow clay-hover"
          >
            <MaterialIcon name="favorite" className="text-xl" />
            Support via Saweria
          </a>
          <a
            href="https://ko-fi.com/rogasper"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-[var(--radius-lg)] font-bold transition-all bg-[#13C3FF] text-white hover:brightness-95 clay-shadow clay-hover"
          >
            <MaterialIcon name="local_cafe" className="text-xl" />
            Support via Ko-fi
          </a>
          <button
            onClick={() => onOpenChange(false)}
            className="mt-3 text-sm text-[var(--warm-silver)] hover:text-[var(--clay-black)] font-semibold transition-colors"
          >
            Mungkin Nanti Saja
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
