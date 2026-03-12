import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const createModelRoundOutputSchema = (options: string[]) =>
  z.object({
    vote: z
      .enum(options as [string, ...string[]])
      .describe(`Your vote — must be exactly one of: ${options.join(", ")}`),
    reasoning: z
      .string()
      .describe(
        "Your argument for this vote. Be specific and compelling — you are trying to persuade the other models."
      ),
    attributedTo: z
      .string()
      .nullable()
      .describe(
        "The model ID whose argument most influenced a vote change this round. null if your vote did not change or this is round 1."
      ),
  });

export const modelRoundOutputJsonSchema = (options: string[]) =>
  zodToJsonSchema(createModelRoundOutputSchema(options));

export const roundSummaryOutputSchema = z.object({
  keyArguments: z
    .array(z.string())
    .describe("The 2-4 strongest arguments made this round"),
  voteChanges: z
    .array(z.string())
    .describe("Notable vote changes and why they happened. Empty array if no changes."),
  tally: z
    .string()
    .describe("Vote tally summary, e.g. 'A: 4, B: 3'"),
  outlook: z
    .string()
    .describe("Brief outlook: is consensus likely next round?"),
});

export const roundSummaryJsonSchema = zodToJsonSchema(roundSummaryOutputSchema);

export const finalSummaryOutputSchema = z.object({
  narrative: z
    .string()
    .describe("2-3 sentence narrative of how the deliberation unfolded. Reference each model by name. Describe who voted for what, who changed their mind, and which model's argument caused changes."),
  strongestPerOption: z
    .record(z.string(), z.string())
    .describe("Map of option ID to the single strongest argument made for it across all rounds"),
  result: z
    .string()
    .describe("Final result description: consensus on X, or no consensus after N rounds"),
  keyTurningPoints: z
    .array(z.string())
    .describe("1-3 key moments that shifted the deliberation"),
  modelDecisions: z
    .array(z.object({
      model: z.string().describe("Model name (e.g. 'claude-4.6-sonnet', 'gpt-5')"),
      finalPosition: z.string().describe("The option ID this model voted for in the final round"),
      changedMind: z.boolean().describe("Whether this model changed its vote at any point during the deliberation"),
      influencedBy: z.string().optional().describe("Name of the model that most influenced a vote change, if applicable"),
      reasoning: z.string().describe("Brief summary of this model's key argument"),
    }))
    .describe("Individual decision summary for each participating model"),
});

export const finalSummaryJsonSchema = zodToJsonSchema(finalSummaryOutputSchema);
