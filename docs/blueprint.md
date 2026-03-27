# **App Name**: Agri Saadhan

## Core Features:

- Mobile OTP Authentication: Implement Supabase Phone Auth with OTP verification, auto-read SMS, and 'Call Me for OTP' fallback. Immediately request Name and Village/Tehsil upon successful OTP verification.
- Localized Onboarding: Language selection grid (Hindi, Marathi, English, Telugu, etc.) on first launch. Display 'Made in India' and partner FPOs/Banks logos for visual trust.
- Voice-Enabled 'Mandi' View: Home screen with a prominent weather widget (temperature and rain forecast). Integrate voice search via a FAB Mic icon, mapping voice inputs (e.g., 'Rotavator chahiye') to equipment queries. This feature relies on a tool to map voice inputs to equipment queries.
- Equipment Listing with Video Preview: Listing details screen prioritizing video previews (autoplay silent preview). Display a 'Gram Panchayat Verified' badge (Green Shield icon) with the owner's village name if verified. Include distance indication ('5 km away - approx 15 mins by Tractor'). Feature a prominent green 'Call Now' button (direct dialer intent).
- Diesel Tracker Protocol: Booking flow with diesel tracking: Driver uploads fuel gauge photo (start), farmer approves, work ends, driver uploads fuel gauge photo (end).
- 'Pay Later' Option: Enable booking with 'PAY_ON_DELIVERY' or 'CREDIT' payment status (if linked to a Sahayak).
- Sahayak Dashboard (Agent Mode): Toggle to enter 'Sahayak Mode'. Implement 'Book for Others' form, prompting for the farmer's name (select from saved list or add new phone number). Display a commission tracker card ('You earned ₹500 this week').

## Style Guidelines:

- Primary color: Earthy brown (#A0522D), reflecting the soil and agricultural landscape.
- Background color: Cream white or faint orange, providing a neutral backdrop to ensure readability.
- Accent color: Olive green (#6B8E23), evoking growth and freshness.
- Body text font: 'PT Sans', a humanist sans-serif to provide a modern, readable look and a touch of warmth and personality
- Headline font: 'Space Grotesk', a proportional sans-serif with a modern, techy feel. Suitable for short titles. Pair with 'PT Sans' for body.
- Use high-contrast, visually distinct icons for equipment categories. Include a green shield icon for 'Gram Panchayat Verified' status.
- Prioritize a clean and intuitive layout suitable for users with low digital literacy, employing large touch targets and clear visual cues.