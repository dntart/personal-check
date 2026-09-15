// Logo de PersonalCheck. Por ahora usa el PNG original (el SVG dibujado a
// mano no salió bien) — el usuario lo va a vectorizar prolijo más adelante.
// Cuando eso pase, solo hay que cambiar la implementación acá adentro, sin
// tocar las páginas que ya usan <Logo /> / <LogoIcon />.
import Image from "next/image";

export function LogoIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-icon.png"
      alt="PersonalCheck"
      width={512}
      height={512}
      className={className}
      priority
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="PersonalCheck"
      width={1254}
      height={1254}
      className={className}
      priority
    />
  );
}
