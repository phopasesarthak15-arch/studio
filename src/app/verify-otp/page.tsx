"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/agri/logo";
import { useI18n } from "@/context/i18n-provider";
import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyOtpClient() {
    const router = useRouter();
    const { t } = useI18n();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    /* =========================
       ✅ CONTINUE HANDLER
    ========================== */
    const handleContinue = () => {
        // 👉 Change this route based on your app logic
        router.push("/dashboard");
    };

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="items-center">
                    <Logo />
                    <CardTitle className="font-headline pt-4">
                        {t("welcome")}
                    </CardTitle>
                    <CardDescription>
                        {t("login_successful") || "You are logged in successfully"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {!isMounted ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <Button
                            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                            onClick={handleContinue}
                        >
                            {t("continue") || "Continue"}
                        </Button>
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