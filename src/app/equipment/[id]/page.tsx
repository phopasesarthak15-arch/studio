"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, MapPin, FileText, Tractor, Tag, Info, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Equipment } from "@/lib/data";
import { useI18n } from "@/context/i18n-provider";

interface UserProfile {
    name: string;
    [key: string]: any;
}

const equipmentTypeTranslations: Record<string, Record<string, string>> = {
    'Tractor': { 'hi': 'ट्रैक्टर', 'mr': 'ट्रॅक्टर', 'pa': 'ਟਰੈਕਟਰ', 'gu': 'ટ્રેક્ટર', 'te': 'ట్రాక్టర్' },
    'Mini Tractor': { 'hi': 'मिनी ट्रैक्टर', 'mr': 'मिनी ट्रॅक्टर', 'pa': 'ਮਿੰਨੀ ਟਰੈਕਟਰ', 'gu': 'મીની ટ્રેક્ટર', 'te': 'మినీ ట్రాక్టర్' },
    'Rotavator': { 'hi': 'रोटावेटर', 'mr': 'रोटाव्हेटर', 'pa': 'ਰੋਟਾਵੇਟਰ', 'gu': 'રોટાવેટર', 'te': 'రోటవేటర్' },
    'Plough': { 'hi': 'हल', 'mr': 'नांगर', 'pa': 'ਹਲ', 'gu': 'હળ', 'te': 'నాగలి' },
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


export default function EquipmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const beneficiaryId = searchParams.get('beneficiaryId');
  const firestore = useFirestore();
  const { t } = useI18n();
  const { user, isUserLoading: isAuthLoading } = useUser();

  const equipmentDocRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'equipment', id);
  }, [firestore, id]);

  const { data: equipment, isLoading: isEquipmentLoading } = useDoc<Equipment>(equipmentDocRef);

  const ownerDocRef = useMemoFirebase(() => {
    if (!firestore || !equipment?.ownerId) return null;
    return doc(firestore, 'users', equipment.ownerId);
  }, [firestore, equipment?.ownerId]);

  const { data: owner, isLoading: isOwnerLoading } = useDoc<UserProfile>(ownerDocRef);

  const isLoading = isEquipmentLoading || isOwnerLoading || isAuthLoading;

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (!equipment) {
    return (
        <div className="container mx-auto py-8 text-center">
            <Tractor className="h-24 w-24 mx-auto text-muted-foreground" />
            <h1 className="mt-4 text-3xl font-bold font-headline">{t('equipment_not_found')}</h1>
            <p className="text-muted-foreground">{t('equipment_removed')}</p>
            <Button asChild className="mt-6">
                <Link href="/equipment">{t('back_to_marketplace')}</Link>
            </Button>
        </div>
    );
  }

  const isOwner = user?.uid === equipment.ownerId;

  const bookingLink = beneficiaryId 
    ? `/booking/${equipment.id}?beneficiaryId=${beneficiaryId}`
    : `/booking/${equipment.id}`;

  const availabilityColor = equipment.availabilityStatus === 'available' ? 'bg-green-500' : 'bg-yellow-500';
  
  const eq = equipment as any;
  const pricePerHour = eq.pricePerHour ?? (eq.price?.unit === 'hour' ? eq.price.amount : null);
  const pricePerDay = eq.pricePerDay ?? (eq.price?.unit === 'day' ? eq.price.amount : null);

  const localLanguage = getLanguageFromLocation(equipment.village);
  const translatedType = equipmentTypeTranslations[equipment.type]?.[localLanguage] || '';

  return (
    <div className="container mx-auto py-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="grid md:grid-cols-2">
            <div className="relative h-80 md:h-full min-h-[400px]">
                <Image
                    src={equipment.imageUrl}
                    alt={equipment.name}
                    fill
                    className="object-cover"
                    data-ai-hint={equipment.imageHint}
                />
            </div>
            <div className="flex flex-col">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <CardTitle className="font-headline text-3xl">
                                {equipment.name}
                                {translatedType && <span className="block text-lg font-normal text-muted-foreground mt-1">({translatedType})</span>}
                            </CardTitle>
                            <CardDescription className="mt-2">
                                {t('by_owner_in_village', { ownerName: owner?.name || t('anonymous'), village: equipment.village })}
                            </CardDescription>
                        </div>
                         {equipment.verified && (
                            <Badge variant="default" className="bg-accent/90 text-accent-foreground backdrop-blur-sm whitespace-nowrap">
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                {t('panchayat_verified')}
                            </Badge>
                        )}
                    </div>
                     <div className="flex flex-wrap gap-2 pt-4">
                        <Badge variant="secondary">{equipment.type}</Badge>
                        <Badge variant="outline" className={`${availabilityColor} text-white border-transparent`}>
                            {equipment.availabilityStatus.charAt(0).toUpperCase() + equipment.availabilityStatus.slice(1)}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="font-semibold font-headline mb-2 flex items-center gap-2"><Info className="h-5 w-5 text-primary" />{t('description')}</h3>
                        <p className="text-sm text-muted-foreground">{equipment.description || t('no_description_provided')}</p>
                    </div>
                    
                    <Separator />
                    
                    {equipment.attachments && equipment.attachments.length > 0 && (
                        <>
                            <div>
                                <h3 className="font-semibold font-headline mb-2 flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" />Included Attachments</h3>
                                <div className="flex flex-wrap gap-2">
                                    {equipment.attachments.map(att => <Badge key={att.name} variant="secondary">{att.name}</Badge>)}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}


                     <div>
                        <h3 className="font-semibold font-headline mb-4 flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />{t('details')}</h3>
                         <div className="flex items-start gap-2 text-muted-foreground text-sm">
                              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                              <span>{equipment.village}</span>
                          </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold font-headline mb-4 flex items-center gap-2">{t('rental_price')}</h3>
                        <div className="space-y-2">
                            {pricePerHour && (
                                <div className="flex justify-between items-baseline text-sm">
                                  <span className="text-muted-foreground">{t('price_per_hour')}</span>
                                  <p className="font-semibold">Rs. {pricePerHour}</p>
                                </div>
                            )}
                            {pricePerDay && (
                                <div className="flex justify-between items-baseline text-sm">
                                  <span className="text-muted-foreground">{t('price_per_day')}</span>
                                  <p className="font-semibold">Rs. {pricePerDay}</p>
                                </div>
                            )}
                         </div>
                         {!pricePerHour && !pricePerDay && (
                             <p className="text-muted-foreground text-sm">{t('price_on_request')}</p>
                         )}
                    </div>
                </CardContent>
                <CardFooter className="mt-auto bg-muted/50 p-6">
                    {isOwner ? (
                        <Button size="lg" className="w-full" disabled>
                            {t('your_own_equipment')}
                        </Button>
                    ) : (
                        <Button size="lg" className="w-full bg-primary hover:bg-primary/90" asChild disabled={equipment.availabilityStatus !== 'available'}>
                            <Link href={bookingLink}>
                                <FileText className="mr-2 h-4 w-4" /> 
                                {equipment.availabilityStatus === 'available' ? t('request_to_book') : t('currently_unavailable')}
                            </Link>
                        </Button>
                    )}
                </CardFooter>
            </div>
        </div>
      </Card>
    </div>
  );
}

const DetailPageSkeleton = () => (
    <div className="container mx-auto py-8">
        <Card className="overflow-hidden shadow-lg">
            <div className="grid md:grid-cols-2">
                <Skeleton className="h-80 md:h-full min-h-[500px]" />
                <div className="flex flex-col p-6">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-5 w-32" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                    </div>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-4/5" />
                    </div>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-24" />
                         <div className="space-y-2">
                             <Skeleton className="h-5 w-full" />
                             <Skeleton className="h-5 w-full" />
                         </div>
                    </div>
                     <div className="mt-auto pt-6">
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        </Card>
    </div>
);
