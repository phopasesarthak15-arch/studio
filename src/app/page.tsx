"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/agri/logo";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/agri/splash-screen";
import { SecondarySplashScreen } from "@/components/agri/secondary-splash-screen";
import { useI18n, Language } from "@/context/i18n-provider";

const languages = [
  { name: "English", code: "en" },
  { name: "हिन्दी", code: "hi" },
  { name: "मराठी", code: "mr" },
  { name: "తెలుగు", code: "te" },
  { name: "ਪੰਜਾਬੀ", code: "pa" },
  { name: "ગુજરાતી", code: "gu" },
];

export default function OnboardingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [splashState, setSplashState] = useState<'initial' | 'secondary' | 'done'>('initial');
  const { setLanguage, t } = useI18n();

  useEffect(() => {
    // Transition from initial to secondary splash once auth is checked
    if (!isUserLoading && splashState === 'initial') {
      setSplashState('secondary');
    }
  }, [isUserLoading, splashState]);

  useEffect(() => {
    // Transition from secondary splash to done after a delay
    if (splashState === 'secondary') {
      const timer = setTimeout(() => {
        setSplashState('done');
      }, 2500); // 2.5 seconds
      return () => clearTimeout(timer);
    }
  }, [splashState]);

  useEffect(() => {
    // Redirect when splashing is done and user is logged in
    if (splashState === 'done' && user) {
      router.replace("/dashboard");
    }
  }, [splashState, user, router]);

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    router.push('/login');
  };

  // Render based on splash state
  if (splashState === 'initial' || isUserLoading) {
    return <SplashScreen />;
  }

  if (splashState === 'secondary') {
    return <SecondarySplashScreen />;
  }

  // splashState is 'done' from here on
  if (user) {
    return null; // Don't show content, we are redirecting
  }

  // If splash is done and no user, show onboarding
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="items-center">
            <Logo />
            <p className="text-muted-foreground pt-2 text-center">
              {t('choose_language_prompt')}
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {languages.map((lang) => (
                <Button key={lang.code} variant="outline" onClick={() => handleLanguageSelect(lang.code as Language)}>
                    {lang.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
