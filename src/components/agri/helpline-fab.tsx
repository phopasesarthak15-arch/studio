
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/context/i18n-provider";

export function HelplineFAB() {
  const [helplineOpen, setHelplineOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Dialog open={helplineOpen} onOpenChange={setHelplineOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-20 md:bottom-6 right-6 h-16 w-16 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 z-50"
          aria-label={t('open_helpline')}
        >
          <Phone className="h-8 w-8" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('need_assistance')}</DialogTitle>
          <DialogDescription>
            {t('helpline_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">{t('call_us_at')}</p>
          <a
            href="tel:+918446252203"
            className="text-2xl font-semibold text-primary tracking-wider"
          >
            +91 84462 52203
          </a>
          <a
            href="tel:+919657539093"
            className="text-2xl font-semibold text-primary tracking-wider"
          >
            +91 96575 39093
          </a>
        </div>
        <DialogFooter>
          <Button asChild className="w-full">
            <a href="tel:+918446252203">
              <Phone className="mr-2 h-4 w-4" /> {t('call_now')}
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
