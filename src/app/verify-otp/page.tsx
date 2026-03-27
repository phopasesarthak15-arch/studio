"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth, useFirestore, setDocumentNonBlocking } from "@/firebase";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/agri/logo";
import { useToast } from "@/hooks/use-toast";
import { useRecaptcha } from "@/hooks/use-recaptcha";
import { signInWithPhoneNumber } from "firebase/auth";
import { useI18n } from "@/context/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";

/* ✅ FIX: Declare global window type */
declare global {
    interface Window {
        confirmationResult: any;
    }
}

export default function VerifyOtpClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const { t } = useI18n();
    const [isMounted, setIsMounted] = useState(false);

    const phone = searchParams.get("phone");
    const appVerifier = useRecaptcha("recaptcha-container-verify");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    /* =========================
       ✅ VERIFY OTP
    ========================== */
    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 6) {
            toast({
                variant: "destructive",
                title: t("toast_error"),
                description: t("toast_invalid_otp"),
            });
            return;
        }

        if (typeof window === "undefined" || !window.confirmationResult) {
            toast({
                variant: "destructive",
                title: t("toast_error"),
                description: "Session expired. Please request OTP again.",
            });
            router.push("/login");
            return;
        }

        setLoading(true);

        try {
            const result = await window.confirmationResult.confirm(otp);
            const user = result.user;

            const userDocRef = doc(firestore, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            /* ✅ FIX: Phone number moved to environment variable — never hardcode in source */
            const isSuperAdmin =
                user.phoneNumber === process.env.NEXT_PUBLIC_SUPER_ADMIN_PHONE;

            if (userDoc.exists()) {
                if (isSuperAdmin) {
                    const currentRoles = userDoc.data().roles || [];

                    if (!currentRoles.includes("ADMIN")) {
                        const newRoles = [...new Set([...currentRoles, "ADMIN"])];

                        await setDocumentNonBlocking(
                            userDocRef,
                            { roles: newRoles },
                            { merge: true }
                        );
                    }

                    router.push("/admin/dashboard");
                } else {
                    router.push("/dashboard");
                }
            } else {
                router.push("/complete-profile");
            }
        } catch (error: any) {
            console.error("Error verifying OTP:", error);

            let title = t("toast_error");
            let description = t("toast_invalid_otp");

            if (error.code === "auth/invalid-verification-code") {
                description = t("toast_invalid_otp");
            } else if (error.code === "auth/code-expired") {
                title = t("toast_otp_expired_title");
                description = t("toast_code_expired_desc");
            } else {
                description = error.message;
            }

            toast({
                variant: "destructive",
                title,
                description,
            });
        } finally {
            setLoading(false);
        }
    };

    /* =========================
       ✅ RESEND OTP
    ========================== */
    const handleResendOtp = async () => {
        if (!auth || !phone || !appVerifier) {
            toast({
                title: t("toast_error"),
                description: t("toast_cannot_resend_otp"),
                variant: "destructive",
            });
            return;
        }

        setResending(true);

        try {
            const confirmationResult = await signInWithPhoneNumber(
                auth,
                `+91${phone}`,
                appVerifier
            );

            /* ✅ FIX: Store globally */
            window.confirmationResult = confirmationResult;

            toast({
                title: t("toast_otp_resent"),
                description: t("toast_otp_resent_desc"),
            });
        } catch (error: any) {
            console.error("Error resending OTP:", error);

            let description = t("toast_resend_failed_desc");

            if (error.code === "auth/too-many-requests") {
                description = t("toast_too_many_requests");
            } else {
                description = error.message || description;
            }

            toast({
                variant: "destructive",
                title: t("toast_resend_failed"),
                description,
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <div id="recaptcha-container-verify"></div>

            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="items-center">
                    <Logo />
                    <CardTitle className="font-headline pt-4">
                        {t("verify_otp")}
                    </CardTitle>
                    <CardDescription>
                        {t("enter_6_digit_code")}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!isMounted ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="otp">{t("otp")}</Label>

                                <Input
                                    id="otp"
                                    type="text"
                                    placeholder={t("otp_placeholder")}
                                    className="text-center tracking-[0.5em]"
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(e.target.value.replace(/\D/g, ""))
                                    }
                                    maxLength={6}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && handleVerifyOtp()
                                    }
                                />
                            </div>

                            <Button
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                                onClick={handleVerifyOtp}
                                disabled={loading || otp.length !== 6}
                            >
                                {loading ? t("verifying") : t("verify")}
                            </Button>

                            <Button
                                variant="link"
                                className="w-full"
                                onClick={handleResendOtp}
                                disabled={resending || !appVerifier}
                            >
                                {resending
                                    ? t("resending_otp")
                                    : t("resend_otp")}
                            </Button>
                        </>
                    )}
                </CardContent>

                <CardFooter className="flex-col gap-4">
                    <p className="text-sm font-bold text-muted-foreground">
                        {t("made_in_india")}
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
