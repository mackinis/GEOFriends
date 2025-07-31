// src/ai/flows/suggest-palette.ts
'use server';

/**
 * @fileOverview AI-powered color palette suggestion flow for branding customization.
 *
 * - suggestPalette - A function that generates color palette suggestions based on a persona description.
 * - SuggestPaletteInput - The input type for the suggestPalette function.
 * - SuggestPaletteOutput - The return type for the suggestPalette function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPaletteInputSchema = z.object({
  personaDescription: z
    .string()
    .describe('A textual description of the app\'s intended persona.'),
});
export type SuggestPaletteInput = z.infer<typeof SuggestPaletteInputSchema>;

const SuggestPaletteOutputSchema = z.object({
  paletteSuggestions: z
    .array(z.string())
    .describe('An array of suggested color palette hex codes.'),
});
export type SuggestPaletteOutput = z.infer<typeof SuggestPaletteOutputSchema>;

export async function suggestPalette(input: SuggestPaletteInput): Promise<SuggestPaletteOutput> {
  return suggestPaletteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPalettePrompt',
  input: {schema: SuggestPaletteInputSchema},
  output: {schema: SuggestPaletteOutputSchema},
  prompt: `You are a branding expert. Based on the provided persona description, suggest a color palette consisting of 5 hex codes that would best represent the brand.\n\nPersona Description: {{{personaDescription}}}\n\nRespond with only an array of hex codes. For example: ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF"]`,
});

const suggestPaletteFlow = ai.defineFlow(
  {
    name: 'suggestPaletteFlow',
    inputSchema: SuggestPaletteInputSchema,
    outputSchema: SuggestPaletteOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
