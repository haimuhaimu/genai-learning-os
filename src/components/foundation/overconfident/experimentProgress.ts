export type ProgressMarker = (nodeId: string, stage: 3) => unknown

export function advanceCrossEntropyInsight(mark: ProgressMarker) {
  mark('cross-entropy', 3)
}
