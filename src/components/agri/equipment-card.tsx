import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Clock } from "lucide-react";
import type { Equipment, Attachment } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/context/i18n-provider";

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


export function EquipmentCard({ equipment, isOwner }: { equipment: Equipment; isOwner: boolean; }) {
  const searchParams = useSearchParams();
  const beneficiaryId = searchParams.get('beneficiaryId');
  const { t } = useI18n();
  
  const linkHref = beneficiaryId 
    ? `/booking/${equipment.id}?beneficiaryId=${beneficiaryId}`
    : `/booking/${equipment.id}`;

  const detailLinkHref = `/equipment/${equipment.id}${beneficiaryId ? `?beneficiaryId=${beneficiaryId}`: ''}`;

  const getDisplayPrice = () => {
    const eq = equipment as any;
    if (eq.pricePerHour) {
      return { amount: eq.pricePerHour, unit: 'hour' };
    }
    if (eq.pricePerDay) {
      return { amount: eq.pricePerDay, unit: 'day' };
    }
    if (eq.price && eq.price.amount && eq.price.unit) {
      return { amount: eq.price.amount, unit: eq.price.unit };
    }
    return null;
  };

  const displayPrice = getDisplayPrice();

  const localLanguage = getLanguageFromLocation(equipment.village);
  const translatedType = equipmentTypeTranslations[equipment.type]?.[localLanguage] || '';

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col group">
      <div className="flex-grow flex flex-col">
        <Link href={detailLinkHref} className="block flex-grow flex flex-col">
            <div className="relative">
              <Image
                src={equipment.imageUrl}
                alt={equipment.name}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
                data-ai-hint={equipment.imageHint}
              />
              {equipment.verified && (
                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-accent/80 px-2 py-1 text-xs font-bold text-accent-foreground backdrop-blur-sm">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t('panchayat_verified')}</span>
                </div>
              )}
            </div>
          <CardHeader>
            <CardTitle className="font-headline group-hover:text-primary transition-colors">
              {equipment.name}
              {translatedType && <span className="block text-sm font-normal text-muted-foreground">({translatedType})</span>}
            </CardTitle>
            <CardDescription>
              {t('in_village', { village: equipment.village })}
            </CardDescription>
            {equipment.attachments && equipment.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                    {equipment.attachments.map((att: Attachment) => (
                        <Badge key={att.name} variant="secondary" className="text-xs font-semibold"> + {att.name}</Badge>
                    ))}
                </div>
            )}
          </CardHeader>
          <CardContent className="space-y-2 mt-auto">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              {displayPrice ? (
                <span className="font-bold text-lg text-primary">
                  Rs. {displayPrice.amount}
                  <span className="text-sm font-normal">{t('price_per_unit', { unit: displayPrice.unit })}</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{t('price_not_set')}</span>
              )}
            </div>
          </CardContent>
        </Link>
      </div>
      <CardFooter>
         {isOwner ? (
            <Button variant="outline" className="w-full" disabled>{t('your_own_equipment')}</Button>
         ) : (
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href={linkHref}>
                    {t('book_now')}
                </Link>
            </Button>
         )}
      </CardFooter>
    </Card>
  );
}
