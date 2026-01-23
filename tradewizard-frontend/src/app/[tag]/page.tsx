import { redirect } from "next/navigation";
import { isValidPoliticalTag } from "@/lib/politics-data";

/**
 * Dynamic route handler for tag-based navigation
 * Redirects to homepage with proper search parameters for better SEO and state management
 * Requirements: 8.4, 8.5
 */
export default async function TagPage({
    params,
}: {
    params: Promise<{ tag: string }>;
}) {
    const { tag } = await params;
    
    // Validate the tag and redirect to homepage with search params
    const validatedTag = isValidPoliticalTag(tag) ? tag : "all";
    
    // Redirect to homepage with tag parameter
    if (validatedTag === "all") {
        // For "all" tag, redirect to clean homepage URL
        redirect("/");
    } else {
        // For specific tags, redirect with search parameter
        redirect(`/?tag=${validatedTag}`);
    }
}