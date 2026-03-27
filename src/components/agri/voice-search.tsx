"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Search, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { voiceEquipmentSearch, VoiceEquipmentSearchOutput } from "@/ai/flows/voice-equipment-search";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/context/i18n-provider";

export function VoiceSearch({ onSearch }: { onSearch: (filters: VoiceEquipmentSearchOutput | null) => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'done'>('idle');
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [result, setResult] = useState<VoiceEquipmentSearchOutput | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const executeSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery) {
      setStatus('idle');
      return;
    }
    setStatus('thinking');
    setResult(null);
    try {
      const searchResult = await voiceEquipmentSearch({ voiceQuery: searchQuery });
      setResult(searchResult);
      onSearch(searchResult);
      setStatus('done');
      setTimeout(() => {
        setOpen(false);
      }, 2000); // Close dialog after 2 seconds
    } catch (error) {
      console.error("AI search failed:", error);
      toast({
        variant: "destructive",
        title: t('toast_search_failed'),
        description: t('toast_search_failed_desc')
      });
      setStatus('idle');
      setOpen(false);
    }
  }, [onSearch, t, toast]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
        toast({
            variant: "destructive",
            title: t('toast_unsupported_browser'),
            description: t('toast_unsupported_browser_desc'),
        });
        setOpen(false);
      return;
    }
    if (status !== 'idle') return;

    setTranscript("");
    setFinalTranscript("");
    setResult(null);
    recognitionRef.current.start();
    setStatus('listening');
  }, [t, toast, status]);


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(interimTranscript);
        setFinalTranscript(final);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            toast({
                variant: 'destructive',
                title: t('toast_mic_denied'),
                description: t('toast_mic_denied_desc'),
            })
        }
        setStatus('idle');
        setOpen(false);
      };
       
       recognition.onend = () => {
         const transcriptToSearch = finalTranscript || transcript;
         if (transcriptToSearch) {
             executeSearch(transcriptToSearch);
         } else {
             setStatus('idle');
             setOpen(false);
         }
       }

      recognitionRef.current = recognition;
    }
  }, [t, toast, executeSearch, finalTranscript, transcript]);
  
  useEffect(() => {
    if (open && status === 'idle') {
      const timer = setTimeout(startListening, 100);
      return () => clearTimeout(timer);
    } else if (!open) {
        if (recognitionRef.current && status === 'listening') {
            recognitionRef.current.stop();
        }
        setStatus('idle');
        setTranscript('');
        setFinalTranscript('');
        setResult(null);
    }
  }, [open, startListening, status]);


  const getDialogContent = () => {
      const displayedTranscript = finalTranscript || transcript;
      switch (status) {
          case 'listening':
              return (
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <Mic className="h-16 w-16 text-primary animate-pulse" />
                      <p className="text-lg font-medium text-muted-foreground">{t('listening')}</p>
                      <p className="min-h-[2.5rem] text-xl font-semibold">{displayedTranscript}</p>
                  </div>
              );
          case 'thinking':
              return (
                 <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <Search className="h-16 w-16 text-primary animate-spin" />
                      <p className="text-lg font-medium text-muted-foreground">{t('thinking')}</p>
                      <p className="min-h-[2.5rem] text-xl font-semibold">{displayedTranscript}</p>
                  </div>
              );
          case 'done':
              if (!result) return null;
              return (
                  <Alert>
                      <Terminal className="h-4 w-4" />
                      <AlertTitle>{t('search_understood')}</AlertTitle>
                      <AlertDescription>
                        {t('looking_for', { equipmentType: result.equipmentType, rentalIntent: result.rentalIntent ? t('for_rent_paren') : '' })}
                      </AlertDescription>
                  </Alert>
              );
          default:
              return (
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                      <Mic className="h-16 w-16 text-muted-foreground" />
                       <p className="text-lg font-medium text-muted-foreground">{t('voice_search')}</p>
                  </div>
              );
      }
  }

  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-40 md:bottom-24 right-6 h-16 w-16 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40"
            aria-label={t('voice_search')}
          >
            <Mic className="h-8 w-8" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md h-64 flex items-center justify-center">
            <DialogHeader className="sr-only">
              <DialogTitle>{t('voice_search')}</DialogTitle>
            </DialogHeader>
            {getDialogContent()}
        </DialogContent>
      </Dialog>
  );
}
