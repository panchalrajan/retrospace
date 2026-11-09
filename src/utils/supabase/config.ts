const supabaseUrlVariable = "NEXT_PUBLIC_SUPABASE_URL";
const supabaseKeyVariable = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missingVariables = [
    !url && supabaseUrlVariable,
    !publishableKey && supabaseKeyVariable,
  ].filter((variable): variable is string => Boolean(variable));

  if (missingVariables.length > 0) {
    throw new Error(
      `Supabase configuration is missing ${missingVariables.join(", ")}. ` +
        "Add the values to .env.local and restart the development server.",
    );
  }

  return { url: url!, publishableKey: publishableKey! };
}
