import Image from "next/image";

export function SecondarySplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-background">
      <Image
        src="https://image2url.com/r2/default/images/1771515184404-482f3415-1604-429c-bd97-18d826273651.jpeg"
        alt="Agri Saadhan Secondary Splash"
        layout="fill"
        objectFit="cover"
        className="animate-zoom-in-out"
      />
    </div>
  );
}
