'use client';

import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ArrowUp } from "lucide-react";
import Link from "next/link";

export const AppFooter = () => {
    const handleScrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-gradient-to-t from-yellow-50 to-cream-100 text-soil-brown">
            <div className="container mx-auto px-6 py-12">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-yellow-200/50">
                    {/* Contact Info */}
                    <div>
                        <h3 className="text-lg font-bold font-headline text-soil-brown">Contact Us</h3>
                        <div className="mt-4 space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-5 w-5" />
                                <span>+91 84462 52203</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-5 w-5" />
                                <span>contact@agrisaadhar.com</span>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="h-5 w-5 mt-1" />
                                <span>
                                    Agri Saadhan Pvt. Ltd.,<br />
                                    Pune, Maharashtra, India
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold font-headline text-soil-brown">About & Support</h3>
                        <nav className="mt-4 space-y-2 text-sm">
                            <Link href="#" className="block hover:underline">Our Story</Link>
                            <Link href="#" className="block hover:underline">FAQ</Link>
                            <Link href="#" className="block hover:underline">Privacy Policy</Link>
                            <Link href="#" className="block hover:underline">Terms of Service</Link>
                        </nav>
                    </div>

                    {/* Follow Us */}
                    <div>
                        <h3 className="text-lg font-bold font-headline text-soil-brown">Follow Us</h3>
                        <div className="mt-4 flex gap-4">
                            <Link href="#" aria-label="Facebook" className="hover:text-primary transition-colors"><Facebook /></Link>
                            <Link href="#" aria-label="Twitter" className="hover:text-primary transition-colors"><Twitter /></Link>
                            <Link href="#" aria-label="Instagram" className="hover:text-primary transition-colors"><Instagram /></Link>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-yellow-200/50 flex flex-col sm:flex-row justify-between items-center text-sm">
                    <p>&copy; {new Date().getFullYear()} Agri Saadhan. All Rights Reserved.</p>
                    <button
                        onClick={handleScrollToTop}
                        className="mt-4 sm:mt-0 flex items-center gap-2 hover:underline"
                    >
                        Back to Top <ArrowUp className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </footer>
    );
};
