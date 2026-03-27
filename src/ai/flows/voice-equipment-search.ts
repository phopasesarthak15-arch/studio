'use server';
/**
 * @fileOverview This file implements a Genkit flow for interpreting a farmer's voice query
 * about farm equipment and transforming it into a structured search query.
 *
 * - voiceEquipmentSearch - A function that processes the voice query.
 * - VoiceEquipmentSearchInput - The input type for the voiceEquipmentSearch function.
 * - VoiceEquipmentSearchOutput - The return type for the voiceEquipmentSearch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const equipmentTypes = [
  "Tractor",
  "Mini Tractor",
  "Rotavator",
  "Plough",
  "Harvester",
  "Sprayer",
  "General Farm Equipment",
] as const;

const VoiceEquipmentSearchInputSchema = z.object({
  voiceQuery: z
    .string()
    .describe(
      'The transcribed voice input from the user, e.g., "Rotavator chahiye" or "Tractor kiraaye par chahiye".'
    ),
});
export type VoiceEquipmentSearchInput = z.infer<typeof VoiceEquipmentSearchInputSchema>;

const VoiceEquipmentSearchOutputSchema = z.object({
  equipmentType: z
    .enum(equipmentTypes)
    .describe(
      'The identified type of farm equipment. If no specific equipment type is identified, return "General Farm Equipment".'
    ),
  rentalIntent: z
    .boolean()
    .describe('True if the user intends to rent the equipment, false otherwise.'),
  keywords: z
    .array(z.string())
    .describe(
      'A list of additional keywords extracted from the query that might help refine the search, like brand names or models.'
    ),
});
export type VoiceEquipmentSearchOutput = z.infer<typeof VoiceEquipmentSearchOutputSchema>;

export async function voiceEquipmentSearch(
  input: VoiceEquipmentSearchInput
): Promise<VoiceEquipmentSearchOutput> {
  return voiceEquipmentSearchFlow(input);
}

const voiceEquipmentSearchPrompt = ai.definePrompt({
  name: 'voiceEquipmentSearchPrompt',
  input: {schema: VoiceEquipmentSearchInputSchema},
  output: {schema: VoiceEquipmentSearchOutputSchema},
  prompt: `You are an AI assistant for a farm equipment rental app. Your task is to interpret a farmer's voice query and convert it into a structured search format.

Available equipment types are: ${equipmentTypes.join(", ")}.

Based on the user's query, identify the single most relevant equipment type from the list above. If the query is too general, doesn't match any type, or mentions multiple types, use "General Farm Equipment".

Also, extract any specific names, models, or other descriptive words from the query as keywords.

Consider the following rules:
- If the query contains phrases like "chahiye" (need), "kiraaye par" (for rent), or similar, assume the user has a rental intent, and set \\\`rentalIntent\\\` to true.

Example 1:
Query: "Tractor chahiye"
Output: { "equipmentType": "Tractor", "rentalIntent": true, "keywords": [] }

Example 2:
Query: "Swaraj rotavator"
Output: { "equipmentType": "Rotavator", "rentalIntent": false, "keywords": ["Swaraj"] }

Example 3:
Query: "khet jotne ke liye kuch" (something for ploughing the field)
Output: { "equipmentType": "Plough", "rentalIntent": false, "keywords": [] }

Voice Query: "{{{voiceQuery}}}"
`,
});

const voiceEquipmentSearchFlow = ai.defineFlow(
  {
    name: 'voiceEquipmentSearchFlow',
    inputSchema: VoiceEquipmentSearchInputSchema,
    outputSchema: VoiceEquipmentSearchOutputSchema,
  },
  async input => {
    const {output} = await voiceEquipmentSearchPrompt(input);
    return output!;
  }
);
