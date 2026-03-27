
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, setDocumentNonBlocking, sendNotification } from "@/firebase";
import { doc, runTransaction } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/agri/logo";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Camera, User, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/context/i18n-provider";
import Image from "next/image";
import { LocationAutocomplete } from "@/components/agri/location-autocomplete";

export default function CompleteProfilePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { t, language } = useI18n();
    
    const [isMounted, setIsMounted] = useState(false);
    const [name, setName] = useState("");
    const [location, setLocation] = useState<{ address: string; lat: number | null; lng: number | null } | null>(null);
    const [roles, setRoles] = useState<string[]>([]);
    const [farmSize, setFarmSize] = useState("");
    const [farmSizeUnit, setFarmSizeUnit] = useState<"acre" | "guntha" | "hectare">("acre");
    const [gender, setGender] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [licenseImagePreview, setLicenseImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const licenseFileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4" />;
    }

    const availableRoles = [
      { id: 'FARMER', label: t('farmer') },
      { id: 'EQUIPMENT_OWNER', label: t('equipment_owner') },
      { id: 'DRIVER', label: t('driver') },
      { id: 'SAHAYAK', label: t('sahayak_agent') }
    ];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'license') => {
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
                if (type === 'profile') {
                    setImagePreview(reader.result as string);
                } else {
                    setLicenseImagePreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGetStarted = async () => {
        if (!user || !firestore || !name || !location?.address || roles.length === 0) {
            toast({
                variant: "destructive",
                title: t('toast_missing_info'),
                description: t('toast_missing_info_desc'),
            });
            return;
        }

        if (roles.includes('FARMER') && (!farmSize || Number(farmSize) <= 0)) {
             toast({ variant: "destructive", title: t('toast_invalid_farm_size'), description: t('toast_invalid_farm_size_desc') });
            return;
        }
        
        if (roles.includes('DRIVER') && !licenseImagePreview) {
             toast({ variant: "destructive", title: "License Required", description: "Please upload a photo of your driving license." });
            return;
        }

        setLoading(true);
        try {
            const userDocRef = doc(firestore, "users", user.uid);
            const isSahayak = roles.includes('SAHAYAK');
            const isDriver = roles.includes('DRIVER');
            const isAdmin = user.phoneNumber === '+918459740545';
            
            const finalRoles = [...new Set([...roles, ...(isAdmin ? ['ADMIN'] : [])])];

            const userData: any = {
                id: user.uid,
                name: name,
                contactPhoneNumber: user.phoneNumber,
                villageTehsil: location.address,
                preferredLanguage: language,
                profilePictureUrl: imagePreview,
                gender: gender || null,
                roles: finalRoles,
                sahayakStatus: isSahayak ? 'PENDING' : 'NONE',
                driverStatus: isDriver ? 'PENDING' : 'NONE',
                farmSize: roles.includes('FARMER') ? Number(farmSize) : null,
                farmSizeUnit: roles.includes('FARMER') ? farmSizeUnit : null,
                latitude: location.lat,
                longitude: location.lng,
                geohash: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            if (isSahayak) {
                userData.commissionRate = 0.05; // Default 5% commission
            }
            if (isDriver) {
                userData.driverLicenseImageUrl = licenseImagePreview;
            }
            
            setDocumentNonBlocking(userDocRef, userData, { merge: true });

            const statsDocRef = doc(firestore, "publicStats", "userCounts");
            await runTransaction(firestore, async (transaction) => {
                const statsDoc = await transaction.get(statsDocRef);
                const currentCounts = statsDoc.data() || { farmers: 0, equipmentOwners: 0, drivers: 0 };
                
                const newCounts = { 
                    farmers: currentCounts.farmers || 0,
                    equipmentOwners: currentCounts.equipmentOwners || 0,
                    drivers: currentCounts.drivers || 0
                };

                if (roles.includes('FARMER')) newCounts.farmers++;
                if (roles.includes('EQUIPMENT_OWNER')) newCounts.equipmentOwners++;
                if (roles.includes('DRIVER')) newCounts.drivers++;
                
                if (statsDoc.exists()) {
                    transaction.update(statsDocRef, newCounts);
                } else {
                    transaction.set(statsDocRef, newCounts);
                }
            });

            sendNotification(user.uid, {
                title: 'Welcome to Agri Saadhan!',
                description: 'Your profile has been created. Explore the app to find what you need.'
            });

            toast({
                title: t('toast_profile_created'),
                description: t('toast_welcome_agri_saadhan'),
            });
            
            if (isAdmin) {
                router.push("/admin/dashboard");
            } else {
                router.push("/dashboard");
            }

        } catch (error: any) {
            console.error("Error creating profile:", error);
            toast({
                variant: "destructive",
                title: t('toast_uh_oh'),
                description: error.message || t('toast_could_not_save_profile'),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="items-center">
                    <Logo />
                    <CardTitle className="font-headline pt-4">{t('just_one_last_step')}</CardTitle>
                    <CardDescription>{t('tell_us_about_yourself')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2 flex flex-col items-center">
                        <Label>{t('profile_picture')}</Label>
                        <div className="relative">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={imagePreview || undefined} alt="User profile" />
                                <AvatarFallback>
                                    <User className="h-12 w-12" />
                                </AvatarFallback>
                            </Avatar>
                            <Button size="icon" variant="outline" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                                <Camera className="h-4 w-4" />
                                <span className="sr-only">{t('upload_picture')}</span>
                            </Button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'profile')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('full_name')}</Label>
                        <Input id="name" placeholder={t('eg_ramesh_kumar')} value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">{t('village_tehsil')}</Label>
                        <LocationAutocomplete
                            onLocationSelect={setLocation}
                            placeholder={t('eg_rampur_hisar')}
                        />
                         {location?.lat && <p className="text-xs text-muted-foreground">{t('location_captured')}: {location.lat.toFixed(4)}, {location.lng?.toFixed(4)}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="gender">{t('gender_optional')}</Label>
                        <Select onValueChange={setGender} value={gender}>
                            <SelectTrigger id="gender"><SelectValue placeholder={t('select_your_gender')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Male">{t('male')}</SelectItem>
                                <SelectItem value="Female">{t('female')}</SelectItem>
                                <SelectItem value="Other">{t('other')}</SelectItem>
                                <SelectItem value="Prefer not to say">{t('prefer_not_to_say')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <Label>{t('i_am_a')}</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {availableRoles.map(role => (
                                <div key={role.id} className="flex items-center space-x-2">
                                    <Checkbox id={role.id} checked={roles.includes(role.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) { setRoles(prev => [...prev, role.id]); } 
                                            else { setRoles(prev => prev.filter(r => r !== role.id)); }
                                        }}
                                    />
                                    <Label htmlFor={role.id} className="font-normal">{role.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {roles.includes('FARMER') && (
                        <div className="space-y-2">
                            <Label>{t('farm_size')}</Label>
                            <div className="flex gap-2">
                                <Input id="farm-size" type="number" placeholder={t('eg_10')} value={farmSize} onChange={(e) => setFarmSize(e.target.value)} min="0.1" step="0.1" className="w-2/3" />
                                <Select value={farmSizeUnit} onValueChange={(value) => setFarmSizeUnit(value as any)}>
                                    <SelectTrigger className="w-1/3">
                                        <SelectValue placeholder={t('select_unit')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="acre">{t('acre')}</SelectItem>
                                        <SelectItem value="guntha">{t('guntha')}</SelectItem>
                                        <SelectItem value="hectare">{t('hectare')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    
                    {roles.includes('DRIVER') && (
                        <div className="space-y-2">
                             <Label>Driving License</Label>
                             <div className="mt-2 flex flex-col items-center justify-center space-y-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50" onClick={() => licenseFileInputRef.current?.click()}>
                                <input type="file" ref={licenseFileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e, 'license')} />
                                {licenseImagePreview ? <Image src={licenseImagePreview} alt="License Preview" width={160} height={100} className="rounded-md object-contain" /> : <><FileText className="h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Upload License Photo</p></>}
                            </div>
                        </div>
                    )}


                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleGetStarted} disabled={loading}>
                        {loading ? t('saving') : t('get_started')}
                    </Button>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <p className="text-sm font-bold text-muted-foreground">{t('made_in_india')}</p>
                </CardFooter>
            </Card>
        </div>
    );
}
