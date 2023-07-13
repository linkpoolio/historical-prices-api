import { binarySearchRoundId } from "./binarySearch";

export async function getStartPhaseData(
  phaseAggregatorContracts,
  startTimestampBigInt,
  publicClient
) {
  for (const phaseAggregatorContract of phaseAggregatorContracts) {
    if (!phaseAggregatorContract.latestRoundId) {
      continue;
    }

    const { roundId, timestamp, error } = await binarySearchRoundId(
      publicClient,
      phaseAggregatorContract.address,
      startTimestampBigInt,
      phaseAggregatorContract.latestRoundId,
      1000 // In seconds: 1000 seconds = 16 minutes
    );

    if (error) {
      continue;
    }

    return {
      phaseId: phaseAggregatorContract.phaseId,
      roundId,
    };
  }

  // Return null if no matching data is found
  return null;
}
