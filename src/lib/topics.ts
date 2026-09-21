import type { Project, TopicTag } from "@/lib/types"
import { TOPIC_TAGS } from "@/lib/types"

export function isTopicTag(value: string): value is TopicTag {
  return (TOPIC_TAGS as readonly string[]).includes(value)
}

/** Hint from name, description, notes, or video topic. Never written until the user confirms. */
export function suggestedTopics(project: Pick<Project, "name" | "description" | "questionsNotes" | "videoTopic" | "primaryMarket">): TopicTag[] {
  const blob = [project.name, project.description, project.questionsNotes, project.primaryMarket, project.videoTopic.join(" ")]
    .filter(Boolean)
    .join("\n")
  const tags: TopicTag[] = []
  if (/\bseniors?\b/i.test(blob)) tags.push("Seniors")
  if (/\bwomen(?:'s|s)?\b|\bwoman\b/i.test(blob)) tags.push("Women's Space")
  if (/\bevents?\b/i.test(blob)) tags.push("Events testimonial")
  return tags
}

export function splitTopics(
  saved: readonly string[] | undefined,
  dismissed: readonly string[] | undefined,
  suggestions: readonly TopicTag[],
): { confirmed: TopicTag[]; suggested: TopicTag[] } {
  const confirmed = (saved ?? []).filter(isTopicTag)
  const confirmedSet = new Set(confirmed)
  const dismissedSet = new Set((dismissed ?? []).filter(isTopicTag))
  const suggested = suggestions.filter((tag) => !confirmedSet.has(tag) && !dismissedSet.has(tag))
  return { confirmed, suggested }
}
