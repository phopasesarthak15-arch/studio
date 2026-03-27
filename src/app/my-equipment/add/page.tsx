
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LinkIcon, UploadCloud, Plus, X } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/context/i18n-provider";
import { LocationAutocomplete } from "@/components/agri/location-autocomplete";

const equipmentTypes = ["Tractor", "Mini Tractor", "Rotavator", "Plough", "Harvester", "Sprayer", "General Farm Equipment"];
const priceLimits = {
    "Tractor": { perHour: 800, perDay: 5000 },
    "Mini Tractor": { perHour: 500, perDay: 3500 },
    "Harvester": { perHour: 3000, perDay: 30000 },
};

type AttachmentState = {
    id: number;
    name: string;
    pricePerHour: string;
    pricePerDay: string;
    imagePreview: string | null;
};

export default function AddEquipmentPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useI18n();

    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [description, setDescription] = useState("");
    const [village, setVillage] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
    const [pricePerHour, setPricePerHour] = useState("");
    const [pricePerDay, setPricePerDay] = useState("");
    const [priceError, setPriceError] = useState({ perHour: '', perDay: '' });
    
    const [imageUrl, setImageUrl] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [loading, setLoading] = useState(false);
    
    const [isMounted, setIsMounted] = useState(false);
    
    const [attachments, setAttachments] = useState<AttachmentState[]>([]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!type) {
            setPriceError({ perHour: '', perDay: '' });
            return;
        }

        const limits = priceLimits[type as keyof typeof priceLimits];
        const errors = { perHour: '', perDay: '' };

        if (limits) {
            if (pricePerHour && Number(pricePerHour) > limits.perHour) {
                errors.perHour = `Max price is Rs. ${limits.perHour}/hr`;
            }
            if (pricePerDay && Number(pricePerDay) > limits.perDay) {
                errors.perDay = `Max price is Rs. ${limits.perDay}/day`;
            }
        }
        
        setPriceError(errors);

    }, [type, pricePerHour, pricePerDay]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 750 * 1024) { // 750KB limit
                toast({
                    variant: "destructive",
                    title: t('toast_image_too_large'),
                    description: t('toast_image_size_limit'),
                });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                setImageUrl(""); 
            };
            reader.readAsDataURL(file);
        }
    };
    
    const addAttachment = () => {
        setAttachments(prev => [...prev, { id: Date.now(), name: '', pricePerHour: '', pricePerDay: '', imagePreview: null }]);
    };

    const updateAttachment = (id: number, field: keyof AttachmentState, value: string) => {
        setAttachments(prev => prev.map(att => att.id === id ? { ...att, [field]: value } : att));
    };

    const removeAttachment = (id: number) => {
        setAttachments(prev => prev.filter(att => att.id !== id));
    };
    
    const handleAttachmentFileChange = (id: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 750 * 1024) { // 750KB limit
                toast({ variant: "destructive", title: t('toast_image_too_large'), description: t('toast_image_size_limit'), });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => prev.map(att => att.id === id ? { ...att, imagePreview: reader.result as string } : att));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddEquipment = async () => {
        if (priceError.perHour || priceError.perDay) {
            toast({
                variant: "destructive",
                title: "Price Limit Exceeded",
                description: "Please check the price limits for the selected equipment type."
            });
            return;
        }

        if (!user || !name || !type || !village?.address || (!pricePerHour && !pricePerDay)) {
            toast({ variant: "destructive", title: t('toast_missing_fields'), description: t('toast_missing_fields_desc') });
            return;
        }

        setLoading(true);

        const defaultImage = PlaceHolderImages.find(img => img.id.includes(type.toLowerCase())) || PlaceHolderImages[0];
        const finalImageUrl = imagePreview || imageUrl || defaultImage.imageUrl;
        
        const finalAttachments = attachments.map(att => ({
            name: att.name,
            pricePerHour: att.pricePerHour ? Number(att.pricePerHour) : undefined,
            pricePerDay: att.pricePerDay ? Number(att.pricePerDay) : undefined,
            imageUrl: att.imagePreview,
        })).filter(att => att.name);


        try {
            const equipmentColRef = collection(firestore, "equipment");
            const newDocData = {
                name, type, description, village: village.address,
                pricePerHour: pricePerHour ? Number(pricePerHour) : null,
                pricePerDay: pricePerDay ? Number(pricePerDay) : null,
                ownerId: user.uid,
                verified: false,
                availabilityStatus: "available",
                latitude: village.lat,
                longitude: village.lng,
                geohash: "tbd",
                imageUrl: finalImageUrl,
                imageHint: defaultImage.imageHint,
                attachments: finalAttachments,
                createdAt: serverTimestamp(),
            };
            const newDocRef = await addDocumentNonBlocking(equipmentColRef, newDocData);
            await setDocumentNonBlocking(newDocRef, { id: newDocRef.id }, { merge: true });

            toast({ title: t('toast_equipment_added'), description: t('toast_equipment_added_desc', { name }) });
            router.push("/my-equipment");

        } catch (error: any) {
            console.error("Error adding equipment:", error);
            toast({ variant: "destructive", title: t('toast_error'), description: error.message || t('toast_could_not_add_equipment_desc') });
        } finally {
            setLoading(false);
        }
    };
    
    if (!isMounted) return <Skeleton className="w-full max-w-2xl mx-auto h-screen" />;

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">{t('list_new_equipment')}</CardTitle>
                <CardDescription>{t('fill_equipment_details')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('equipment_name')}</Label>
                        <Input id="name" placeholder={t('eg_swaraj')} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="type">{t('equipment_type')}</Label>
                        <Select onValueChange={setType} value={type}>
                            <SelectTrigger id="type"><SelectValue placeholder={t('select_a_type')} /></SelectTrigger>
                            <SelectContent>{equipmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="description">{t('description')}</Label>
                    <Textarea id="description" placeholder={t('describe_equipment')} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                
                <div className="space-y-2">
                    <Label>{t('equipment_image')}</Label>
                    <Tabs defaultValue="upload" className="w-full">
                        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="upload">{t('upload')}</TabsTrigger><TabsTrigger value="url">{t('from_url')}</TabsTrigger></TabsList>
                        <TabsContent value="upload">
                            <div className="mt-2 flex flex-col items-center justify-center space-y-2 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                {imagePreview ? <Image src={imagePreview} alt="Preview" width={192} height={128} className="rounded-md object-cover" /> : <><UploadCloud className="h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">{t('click_to_upload')}</p></>}
                            </div>
                        </TabsContent>
                        <TabsContent value="url">
                            <div className="flex gap-2 items-center pt-2">
                                <LinkIcon className="h-5 w-5 text-muted-foreground"/>
                                <Input id="imageUrl" type="url" placeholder={t('paste_image_link')} value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImagePreview(null); }} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
                
                <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex justify-between items-center">
                        <Label>Included Attachments (Optional)</Label>
                        <Button variant="outline" size="sm" onClick={addAttachment}>
                            <Plus className="mr-2 h-4 w-4" /> Add Attachment
                        </Button>
                    </div>
                    <div className="space-y-4">
                        {attachments.map((att, index) => (
                            <div key={att.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeAttachment(att.id)}>
                                    <X className="h-4 w-4" />
                                </Button>
                                <div className="grid md:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-2">
                                        <Label htmlFor={`att-name-${index}`}>Attachment Name</Label>
                                        <Input id={`att-name-${index}`} placeholder="e.g. Rotavator" value={att.name} onChange={(e) => updateAttachment(att.id, 'name', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`att-image-${index}`}>Attachment Image</Label>
                                        <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-background h-28" onClick={() => document.getElementById(`att-file-${index}`)?.click()}>
                                            <input type="file" id={`att-file-${index}`} className="hidden" accept="image/*" onChange={(e) => handleAttachmentFileChange(att.id, e)} />
                                            {att.imagePreview ? <Image src={att.imagePreview} alt={`${att.name} Preview`} width={96} height={96} className="rounded-md object-contain h-full w-auto" /> : <div className="text-center"><UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" /><p className="text-xs text-muted-foreground">{t('click_to_upload')}</p></div>}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-normal">Rental Price for {att.name || 'Attachment'}</Label>
                                    <p className="text-xs text-muted-foreground">This price will be added to the base price if specified.</p>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span><Input type="number" placeholder={t('price_per_hour')} className="pl-9" value={att.pricePerHour} onChange={(e) => updateAttachment(att.id, 'pricePerHour', e.target.value)} /></div>
                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span><Input type="number" placeholder={t('price_per_day')} className="pl-9" value={att.pricePerDay} onChange={(e) => updateAttachment(att.id, 'pricePerDay', e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="village">{t('village_tehsil')}</Label>
                    <LocationAutocomplete
                        onLocationSelect={setVillage}
                        placeholder={t('eg_ramgarh')}
                    />
                    {village?.lat && <p className="text-xs text-green-600">{t('location_captured')}</p>}
                </div>

                <div>
                    <Label>Base Rental Price</Label>
                    <p className="text-xs text-muted-foreground">Price for the main equipment only. Attachment prices are separate.</p>
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                             <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span>
                                <Input id="pricePerHour" type="number" placeholder={t('price_per_hour')} className="pl-9" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} />
                            </div>
                            {priceError.perHour && <p className="text-xs text-destructive mt-1">{priceError.perHour}</p>}
                        </div>
                        <div className="space-y-1">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rs.</span>
                                <Input id="pricePerDay" type="number" placeholder={t('price_per_day')} className="pl-9" value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} />
                            </div>
                            {priceError.perDay && <p className="text-xs text-destructive mt-1">{priceError.perDay}</p>}
                        </div>
                    </div>
                </div>

                <Button className="w-full" onClick={handleAddEquipment} disabled={loading || isUserLoading || !!priceError.perHour || !!priceError.perDay}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('listing')}...</> : t('add_to_marketplace')}
                </Button>
            </CardContent>
        </Card>
    );
}

