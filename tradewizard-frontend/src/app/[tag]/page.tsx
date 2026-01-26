import { redirect } from "next/navigation";
import { isValidPoliticalTag } from "@/lib/politics-data";

/**
 * Dynamic route handler for tag-based navigation
 * Implements Requirements 2.7, 4.8, 4.9 - slug-based routing for tag pages
 */
export default async function TagPage({
    params,
}: {
    params: Promise<{ tag: string }>;
}) {
    const { tag } = await params;
    
    // Validate the tag and redirect to homepage with search params
    const validatedTag = isValidPoliticalTag(tag) ? tag : "all";
    
    // Redirect to homepage with tag parameter for proper state management
    if (validatedTag === "all") {
        // For "all" tag, redirect to clean homepage URL
        redirect("/");
    } else {
        // For specific tags, redirect with search parameter to maintain URL structure
        redirect(`/?tag=${validatedTag}`);
    }
}