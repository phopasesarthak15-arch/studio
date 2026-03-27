
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { collection, query, where } from "firebase/firestore";
import type { Equipment, Booking } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/i18n-provider";
import { LiveBookingTracker } from "@/components/agri/live-booking-tracker";

const equipmentTypeTranslations: Record<string, Record<string, string>> = {
    'Tractor': { 'hi': 'ट्रैक्टर', 'mr': 'ट्रॅक्टर', 'pa': 'ਟਰੈਕਟਰ', 'gu': 'ટ્રેક્ટર', 'te': 'ట్రాక్టర్' },
    'Mini Tractor': { 'hi': 'मिनी ट्रैक्टर', 'mr': 'मिनी ट्रॅक्टर', 'pa': 'ਮਿੰਨੀ ਟਰੈਕਟਰ', 'gu': 'મીની ટ્રેક્ટર', 'te': 'మినీ ట్రాక్టర్' },
    'Rotavator': { 'hi': 'रोटावेटर', 'mr': 'रोटाव्हेटर', 'pa': 'ਰੋਟਾਵੇਟਰ', 'gu': 'રોટાવેટર', 'te': 'రోటవేటర్' },
    'Plow': { 'hi': 'हल', 'mr': 'नांगर', 'pa': 'ਹਲ', 'gu': 'હળ', 'te': 'నాగలి' },
    'Harvester': { 'hi': 'हार्वेस्टर', 'mr': 'हार्वेस्टर', 'pa': 'ਹਾਰਵੈਸਟਰ', 'gu': 'હાર્વેસ્ટર', 'te': 'హార్వెస్టర్' },
    'Sprayer': { 'hi': 'स्प्रेयर', 'mr': 'स्प्रेअर', 'pa': 'ਸਪਰੇਅਰ', 'gu': 'સ્પ્રેયર', 'te': 'స్ప్రేయర్' },
    'General Farm Equipment': { 'hi': 'सामान्य कृषि उपकरण', 'mr': 'सामान्य शेती उपकरणे', 'pa': 'ਆਮ ਖੇਤੀਬਾੜੀ ਉਪਕਰਣ', 'gu': 'સામાન્ય ખેતી સાધનો', 'te': 'సాధారణ వ్యవసాయ పరికరాలు' }
};

const getLanguageFromLocation = (location: string): string => {
    if (!location) return 'hi';
    const lowerLocation = location.toLowerCase();
    if (lowerLocation.includes('maharashtra')) return 'mr';
    if (lowerLocation.includes('punjab')) return 'pa';
    if (lowerLocation.includes('gujarat')) return 'gu';
    if (lowerLocation.includes('telangana') || lowerLocation.includes('andhra')) return 'te';
    return 'hi'; // Default
};

function EquipmentSlider() {
    const firestore = useFirestore();
    const { t } = useI18n();
    const equipmentColRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'equipment');
    }, [firestore]);
    const { data: allEquipment, isLoading } = useCollection<Equipment>(equipmentColRef);

    const plugin = React.useRef(
        Autoplay({ delay: 3000, stopOnInteraction: true, stopOnMouseEnter: true })
    );

    const [api, setApi] = React.useState<CarouselApi>();
    const [current, setCurrent] = React.useState(0);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    React.useEffect(() => {
        if (!api) return;

        setCurrent(api.selectedScrollSnap());

        const onSelect = () => {
          setCurrent(api.selectedScrollSnap());
        };

        api.on("select", onSelect);
        
        return () => {
            api.off("select", onSelect);
        };
    }, [api]);

    if (!isMounted || isLoading) {
        return <Skeleton className="h-64 w-full rounded-lg" />;
    }

    if (!allEquipment || allEquipment.length === 0) {
        return null;
    }
    
    // Featuring some equipment
    const featuredEquipment = allEquipment.slice(0, 5); 

    return (
        <div className="relative">
            <Carousel 
                plugins={[plugin.current]} 
                className="w-full" 
                setApi={setApi}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
                opts={{
                  loop: true,
                }}
            >
                <CarouselContent>
                    {featuredEquipment.map((equipment) => {
                        const localLanguage = getLanguageFromLocation(equipment.village);
                        const translatedType = equipmentTypeTranslations[equipment.type]?.[localLanguage] || '';
                        return (
                            <CarouselItem key={equipment.id}>
                                <Link href={`/equipment/${equipment.id}`}>
                                    <div className="overflow-hidden rounded-lg">
                                        <div className="relative aspect-video md:aspect-[2.4/1]">
                                            <Image
                                                src={equipment.imageUrl}
                                                alt={equipment.name}
                                                fill
                                                className="object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-0 left-0 p-6">
                                                <h3 className="text-xl md:text-2xl font-bold text-white font-headline">
                                                    {equipment.name}
                                                    {translatedType && <span className="block text-base font-normal text-gray-300">({translatedType})</span>}
                                                </h3>
                                                <p className="text-sm text-gray-200">{equipment.type} in {equipment.village}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </CarouselItem>
                        );
                    })}
                </CarouselContent>
            </Carousel>
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {featuredEquipment.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => api?.scrollTo(i)}
                        className={cn(
                            "h-2 w-2 rounded-full transition-all",
                            current === i ? "w-4 bg-white" : "bg-white/50"
                        )}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const { t } = useI18n();
  const firestore = useFirestore();

  const activeBookingsQuery = useMemoFirebase(() => {
      if (!user || !firestore) return null;
      return query(
          collection(firestore, "bookings"),
          where("participants", "array-contains", user.uid),
          where("status", "==", "accepted"),
          where("paymentStatus", "==", "completed")
      );
  }, [user, firestore]);

  const { data: activeBookings, isLoading: isActiveBookingsLoading } = useCollection<Booking>(activeBookingsQuery);

  return (
    <div className="space-y-8">
      {isActiveBookingsLoading && <Skeleton className="h-80 w-full" />}
      {activeBookings && activeBookings.length > 0 && (
          <div className="space-y-4">
              {activeBookings.map(booking => (
                  <LiveBookingTracker key={booking.id} booking={booking} />
              ))}
          </div>
      )}
      <Card className="border bg-black/20 backdrop-blur-md border-white/10 text-white">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">
            {t('welcome_to_agri_saadhan')}
          </CardTitle>
          <CardDescription className="text-white/80">
            {t('dashboard_hub_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            {t('dashboard_welcome_message')}
          </p>
        </CardContent>
      </Card>
      
      <EquipmentSlider />

    </div>
  );
}
