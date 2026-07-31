import type { FixtureVariant } from "./media";

export const REPLAY_MODEL_ID = "replay:expected-fixture-v1";

/** Expected UI-policy traces. These are deliberately not represented as model output. */
export function createReplayToolCalls(variant: FixtureVariant) {
  const redMove = {
    name: "record_change",
    arguments: {
      description: "Red marker moved above the sketchbook",
      classification: "intended",
    },
  };
  if (variant === "clean") {
    return [
      redMove,
      {
        name: "commit_patch",
        arguments: { summary: "Move the red marker above the sketchbook" },
      },
    ];
  }
  if (variant === "uncertain") {
    return [
      redMove,
      {
        name: "record_change",
        arguments: {
          description: "The right side of the changed scene is occluded",
          classification: "uncertain",
        },
      },
      {
        name: "block_commit",
        arguments: { reason: "Occlusion prevents a reliable scene comparison" },
      },
    ];
  }
  return [
    redMove,
    {
      name: "record_change",
      arguments: {
        description: "Blue marker is present before but missing after",
        classification: "unexplained",
      },
    },
    {
      name: "block_commit",
      arguments: { reason: "The blue marker removal was not requested" },
    },
  ];
}
