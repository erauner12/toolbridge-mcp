/**
 * Line-level diff computation for note editing.
 *
 * Ports Python toolbridge_mcp/utils/diff.py functionality.
 * Uses the `diff` npm package for line-based comparison.
 */

import * as Diff from "diff";

// ============================================================================
// Types
// ============================================================================

export type HunkKind = "unchanged" | "added" | "removed" | "modified";
export type HunkStatus = "pending" | "accepted" | "rejected" | "revised";

export interface DiffHunk {
  kind: HunkKind;
  original: string;
  proposed: string;
  id: string | null;
  origStart: number | null;
  origEnd: number | null;
  newStart: number | null;
  newEnd: number | null;
  // Internal fields for accurate line counting
  _origLineCount?: number;
  _newLineCount?: number;
}

export interface HunkDecision {
  status: HunkStatus;
  revisedText: string | null;
}

// ============================================================================
// Diff Computation
// ============================================================================

/**
 * Compute line-level diff between original and proposed content.
 */
export function computeLineDiff(
  original: string,
  proposed: string,
  options: {
    contextLines?: number;
    maxUnchangedLines?: number;
    truncateUnchanged?: boolean;
  } = {}
): DiffHunk[] {
  const {
    maxUnchangedLines = 5,
    truncateUnchanged = true,
  } = options;

  // Handle empty inputs
  if (!original && !proposed) {
    return [];
  }

  if (!original) {
    return [
      {
        kind: "added",
        original: "",
        proposed,
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: 0,
        _newLineCount: proposed.split("\n").length,
      },
    ];
  }

  if (!proposed) {
    return [
      {
        kind: "removed",
        original,
        proposed: "",
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: original.split("\n").length,
        _newLineCount: 0,
      },
    ];
  }

  // Use diff library for line-based comparison
  const changes = Diff.diffLines(original, proposed);

  const hunks: DiffHunk[] = [];

  for (const change of changes) {
    const text = change.value;
    const lineCount = change.count ?? text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

    if (!change.added && !change.removed) {
      // Unchanged section
      let displayText = text;

      if (truncateUnchanged && text) {
        const lines = text.split("\n");
        if (lines.length > maxUnchangedLines) {
          const half = Math.floor(maxUnchangedLines / 2);
          displayText =
            lines.slice(0, half).join("\n") +
            `\n... (${lines.length - maxUnchangedLines} lines unchanged) ...\n` +
            lines.slice(-half).join("\n");
        }
      }

      hunks.push({
        kind: "unchanged",
        original: displayText,
        proposed: displayText,
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: lineCount,
        _newLineCount: lineCount,
      });
    } else if (change.added) {
      // Added section
      hunks.push({
        kind: "added",
        original: "",
        proposed: text,
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: 0,
        _newLineCount: lineCount,
      });
    } else if (change.removed) {
      // Removed section
      hunks.push({
        kind: "removed",
        original: text,
        proposed: "",
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: lineCount,
        _newLineCount: 0,
      });
    }
  }

  // Merge consecutive remove+add into "modified"
  return mergeConsecutiveChanges(hunks);
}

/**
 * Merge consecutive remove+add hunks into modified hunks.
 */
function mergeConsecutiveChanges(hunks: DiffHunk[]): DiffHunk[] {
  const result: DiffHunk[] = [];
  let i = 0;

  while (i < hunks.length) {
    const current = hunks[i];

    // Check if this is a removed followed by added (modification)
    if (
      current.kind === "removed" &&
      i + 1 < hunks.length &&
      hunks[i + 1].kind === "added"
    ) {
      const next = hunks[i + 1];
      result.push({
        kind: "modified",
        original: current.original,
        proposed: next.proposed,
        id: null,
        origStart: null,
        origEnd: null,
        newStart: null,
        newEnd: null,
        _origLineCount: current._origLineCount,
        _newLineCount: next._newLineCount,
      });
      i += 2;
    } else {
      result.push(current);
      i++;
    }
  }

  return result;
}

/**
 * Annotate hunks with stable IDs and line ranges.
 */
export function annotateHunksWithIds(hunks: DiffHunk[]): DiffHunk[] {
  const annotated: DiffHunk[] = [];
  let origLine = 1;
  let newLine = 1;

  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    const hunkId = `h${i + 1}`;

    // Use stored line counts if available
    const origLen = hunk._origLineCount ?? (hunk.original ? hunk.original.split("\n").length : 0);
    const newLen = hunk._newLineCount ?? (hunk.proposed ? hunk.proposed.split("\n").length : 0);

    // Compute line ranges
    let origStart: number | null = null;
    let origEnd: number | null = null;
    let newStart: number | null = null;
    let newEnd: number | null = null;

    if (hunk.kind !== "added" && origLen > 0) {
      origStart = origLine;
      origEnd = origLine + origLen - 1;
    }

    if (hunk.kind !== "removed" && newLen > 0) {
      newStart = newLine;
      newEnd = newLine + newLen - 1;
    }

    annotated.push({
      ...hunk,
      id: hunkId,
      origStart,
      origEnd,
      newStart,
      newEnd,
    });

    // Advance line counters
    if (origLen > 0) {
      origLine += origLen;
    }
    if (newLen > 0) {
      newLine += newLen;
    }
  }

  return annotated;
}

/**
 * Truncate long unchanged sections for display.
 * Called AFTER annotateHunksWithIds so line ranges are accurate.
 */
export function truncateUnchangedForDisplay(
  hunks: DiffHunk[],
  maxLines: number = 5
): DiffHunk[] {
  return hunks.map((h) => {
    if (h.kind === "unchanged" && h.original) {
      const lines = h.original.split("\n");
      if (lines.length > maxLines) {
        const half = Math.floor(maxLines / 2);
        const truncated =
          lines.slice(0, half).join("\n") +
          `\n... (${lines.length - maxLines} lines unchanged) ...\n` +
          lines.slice(-half).join("\n");
        return {
          ...h,
          original: truncated,
          proposed: truncated,
        };
      }
    }
    return h;
  });
}

// ============================================================================
// Hunk Application
// ============================================================================

/**
 * Apply per-hunk decisions to produce the final merged content.
 */
export function applyHunkDecisions(
  hunks: DiffHunk[],
  decisions: Map<string, HunkDecision>
): string {
  const segments: string[] = [];

  for (const hunk of hunks) {
    const hunkId = hunk.id ?? "";
    const decision = decisions.get(hunkId);

    if (hunk.kind === "unchanged") {
      // Unchanged hunks always use original
      segments.push(hunk.original);
    } else if (hunk.kind === "added") {
      if (!decision || decision.status === "pending") {
        throw new Error(`Hunk ${hunkId} is pending - cannot apply`);
      }
      if (decision.status === "accepted") {
        segments.push(hunk.proposed);
      } else if (decision.status === "rejected") {
        // Reject addition = don't include it
      } else if (decision.status === "revised" && decision.revisedText !== null) {
        segments.push(decision.revisedText);
      }
    } else if (hunk.kind === "removed") {
      if (!decision || decision.status === "pending") {
        throw new Error(`Hunk ${hunkId} is pending - cannot apply`);
      }
      if (decision.status === "accepted") {
        // Accept removal = don't include original
      } else if (decision.status === "rejected") {
        // Reject removal = keep original
        segments.push(hunk.original);
      } else if (decision.status === "revised" && decision.revisedText !== null) {
        segments.push(decision.revisedText);
      }
    } else if (hunk.kind === "modified") {
      if (!decision || decision.status === "pending") {
        throw new Error(`Hunk ${hunkId} is pending - cannot apply`);
      }
      if (decision.status === "accepted") {
        segments.push(hunk.proposed);
      } else if (decision.status === "rejected") {
        segments.push(hunk.original);
      } else if (decision.status === "revised" && decision.revisedText !== null) {
        segments.push(decision.revisedText);
      }
    }
  }

  // Join segments directly (preserving original line endings)
  return segments.join("");
}

/**
 * Count changes by type.
 */
export function countChanges(hunks: DiffHunk[]): Record<HunkKind, number> {
  const counts: Record<HunkKind, number> = {
    unchanged: 0,
    added: 0,
    removed: 0,
    modified: 0,
  };

  for (const hunk of hunks) {
    counts[hunk.kind]++;
  }

  return counts;
}
