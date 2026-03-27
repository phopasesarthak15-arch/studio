import { Logo } from "@/components/agri/logo";

export function SplashScreen() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="animate-zoom-in-out">
        <Logo />
      </div>
    </div>
  );
}
