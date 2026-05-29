import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@labas/ui/components/dialog";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { CommunityChannelList } from "@/components/CommunityChannelList";

export function CommunityModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-6 rounded-[var(--radius-xl)] bg-[var(--pure-white)] border-2 border-[var(--oat-border)]">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-[var(--matcha-300)]/30 rounded-full flex items-center justify-center mb-2">
            <MaterialIcon name="forum" className="text-4xl text-[var(--matcha-800)]" />
          </div>
          <DialogTitle className="text-center text-2xl font-headline font-extrabold text-[var(--clay-black)]">
            Gabung Komunitas Labas
          </DialogTitle>
          <DialogDescription className="text-center text-base text-[var(--warm-charcoal)] pt-2 leading-relaxed">
            Belajar bahasa, lapor bug, atau ikut ngembangin Labas — pilih channel yang paling pas.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <CommunityChannelList variant="modal" />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-5 w-full text-sm text-[var(--warm-silver)] hover:text-[var(--clay-black)] font-semibold transition-colors"
          >
            Nanti Saja
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
