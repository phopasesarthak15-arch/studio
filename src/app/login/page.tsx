"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/agri/logo";
import { useAuth } from "@/firebase";
import { signInWithPhoneNumber } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { useI18n } from "@/context/i18n-provider";

declare global {
    interface Window {
        confirmationResult: any;
    }
}

export default function LoginPage() {
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const { t } = useI18n();

    // The useRecaptcha hook will handle initializing the verifier
    const appVerifier = useRecaptcha('recaptcha-container');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleSendOtp = async () => {
        if (!auth || !appVerifier) {
            toast({
                variant: "destructive",
                title: t('toast_error'),
                description: t('toast_auth_service_not_ready'),
            });
            return;
        };
        setLoading(true);
        try {
            const confirmationResult = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, appVerifier);
            window.confirmationResult = confirmationResult;
            router.push(`/verify-otp?phone=${phoneNumber}`);
        } catch (error: any) {
            console.error("Error sending OTP:", error);

            let description = t('toast_otp_failed');
            if (error.code === 'auth/too-many-requests') {
                description = t('toast_too_many_requests');
            } else if (error.code === 'auth/operation-not-allowed') {
                description = t('toast_phone_signin_not_enabled');
            } else if (error.code === 'auth/invalid-phone-number') {
                description = t('toast_invalid_phone_number');
            } else if (error.message.includes('reCAPTCHA')) {
                description = t('toast_recaptcha_failed');
            }
             else {
                description = error.message || description;
            }

            toast({
                variant: "destructive",
                title: t('toast_auth_error'),
                description: description,
            });
            
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      {/* This container is used by the useRecaptcha hook */}
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="items-center">
          <Logo />
          <CardTitle className="font-headline pt-4">{t('welcome_back')}</CardTitle>
          <CardDescription>{t('enter_mobile_to_login')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isMounted ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('mobile_number')}</Label>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border bg-muted px-3 py-2 text-sm">+91</span>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('mobile_number')}</Label>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border bg-muted px-3 py-2 text-sm">+91</span>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder={t('phone_placeholder')}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" 
                onClick={handleSendOtp}
                disabled={loading || phoneNumber.length !== 10 || !appVerifier}
              >
                {loading ? t('sending_otp') : t('send_otp')}
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-4">
           <p className="text-sm font-bold text-muted-foreground">
              {t('made_in_india')}
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
