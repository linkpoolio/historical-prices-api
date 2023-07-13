import EACAggregatorProxy from "../abi/EACAggregatorProxy.json";

export const binarySearchRoundId = async (
  client,
  contractAddress,
  targetTimestamp
) => {
  const aggregatorContract = {
    address: contractAddress,
    abi: EACAggregatorProxy,
  } as const;

  let latestRoundData;
  try {
    latestRoundData = await client.readContract({
      ...aggregatorContract,
      functionName: "latestRoundData",
    });
  } catch (error) {
    console.error("Failed to fetch latest round data:", error);
    throw error;
  }

  let low = BigInt(0);
  let high = BigInt(latestRoundData[0]);
  let closest = high;
  let closestRoundData = null;

  while (low <= high) {
    const mid = low + (high - low) / BigInt(2);

    let roundData;
    try {
      roundData = await client.readContract({
        ...aggregatorContract,
        functionName: "getRoundData",
        args: [mid.toString()],
      });
    } catch (error) {
      low = mid + BigInt(1);
      continue;
    }

    if (roundData && roundData[3]) {
      const midTimestamp = BigInt(roundData[3]);

      if (midTimestamp === targetTimestamp) {
        return { roundId: mid, roundData };
      }

      if (midTimestamp < targetTimestamp) {
        low = mid + BigInt(1);
      } else {
        high = mid - BigInt(1);
      }

      if (
        Math.abs(Number(midTimestamp) - Number(targetTimestamp)) <
        Math.abs(Number(closest) - Number(targetTimestamp))
      ) {
        closest = mid;
        closestRoundData = roundData;
      }
    } else {
      low = mid + BigInt(1);
    }
  }

  return { roundId: closest, roundData: closestRoundData };
};
