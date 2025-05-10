'use server';

/**
 * @fileOverview An AI agent that suggests improvements to a user's GitHub profile.
 *
 * - suggestImprovements - A function that handles the suggestion of improvements.
 * - SuggestImprovementsInput - The input type for the suggestImprovements function.
 * - SuggestImprovementsOutput - The return type for the suggestImprovements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {GitHubProfile, GitHubRepository} from '@/services/github';

const SuggestImprovementsInputSchema = z.object({
  username: z.string().describe('The GitHub username to analyze.'),
  profile: z.any().describe('The GitHub profile data of the user.'),
  repositories: z.any().describe('The GitHub repositories of the user.'),
});
export type SuggestImprovementsInput = z.infer<typeof SuggestImprovementsInputSchema>;

const SuggestImprovementsOutputSchema = z.object({
  suggestions: z.string().describe('AI-generated suggestions for improvements to the user\'s GitHub profile.'),
});
export type SuggestImprovementsOutput = z.infer<typeof SuggestImprovementsOutputSchema>;

export async function suggestImprovements(input: SuggestImprovementsInput): Promise<SuggestImprovementsOutput> {
  return suggestImprovementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImprovementsPrompt',
  input: {
    schema: SuggestImprovementsInputSchema,
  },
  output: {
    schema: SuggestImprovementsOutputSchema,
  },
  prompt: `You are an AI mentor analyzing a GitHub profile and providing suggestions for improvements.

  Analyze the following GitHub profile and repositories, and suggest specific improvements the user can make to their code quality, contributions, or projects.

  Profile:
  {{profile}}

  Repositories:
  {{#each repositories}}
  - Name: {{name}}, URL: {{url}}, Language: {{language}}, Stars: {{stars}}, Last Updated: {{lastUpdated}}
  {{/each}}

  Respond with actionable suggestions the user can use to improve their GitHub profile and become a better developer.
  `,
});

const suggestImprovementsFlow = ai.defineFlow(
  {
    name: 'suggestImprovementsFlow',
    inputSchema: SuggestImprovementsInputSchema,
    outputSchema: SuggestImprovementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
