// OptimizerPasswordGate — DEVRE DISI BIRAKILDI
// Sifre korumasi kaldirildi. Bu dosya geriye donuk uyumluluk icin tutulmustur.

interface Props {
  onVerified: () => void;
}

export default function OptimizerPasswordGate({ onVerified }: Props) {
  // Sifre kontrolu olmadan dogrudan gecis
  onVerified();
  return null;
}
