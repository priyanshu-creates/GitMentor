'use server';

/**
 * @fileOverview Provides project suggestions based on a user's GitHub profile.
 *
 * - suggestProjects - A function that suggests project ideas.
 * - SuggestProjectsInput - The input type for the suggestProjects function.
 * - SuggestProjectsOutput - The return type for the suggestProjects function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getGitHubRepositories, getGitHubProfile} from '@/services/github';

const SuggestProjectsInputSchema = z.object({
  username: z.string().describe('The GitHub username to analyze.'),
});
export type SuggestProjectsInput = z.infer<typeof SuggestProjectsInputSchema>;

const SuggestProjectsOutputSchema = z.object({
  projectSuggestions: z.array(
    z.string().describe('A project idea tailored to the user.')
  ).describe('A list of project suggestions based on the user profile and activity.'),
});
export type SuggestProjectsOutput = z.infer<typeof SuggestProjectsOutputSchema>;

export async function suggestProjects(input: SuggestProjectsInput): Promise<SuggestProjectsOutput> {
  return suggestProjectsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProjectsPrompt',
  input: {schema: SuggestProjectsInputSchema},
  output: {schema: SuggestProjectsOutputSchema},
  prompt: `Based on the GitHub profile and repositories of {{username}}, suggest 3 project ideas that align with their skills and interests. Be creative and inspiring.

Consider their recent repositories and languages used:

{{#each repositories}}
- {{name}} ({{language}})
{{/each}}

And their GitHub profile information:

{{profile.bio}}

Project Ideas:
`, // Modified: Added profile information to the prompt
});

const suggestProjectsFlow = ai.defineFlow(
  {
    name: 'suggestProjectsFlow',
    inputSchema: SuggestProjectsInputSchema,
    outputSchema: SuggestProjectsOutputSchema,
  },
  async input => {
    const profile = await getGitHubProfile(input.username);
    const repositories = await getGitHubRepositories(input.username);

    const {output} = await prompt({
      ...input,
      profile,
      repositories,
    });
    return output!;
  }
);
