import AccessControlledOffchainAggregator from "../abi/EACAggregatorProxy.json";

export const binarySearchRoundId = async (
  client,
  contractAddress,
  targetTimestamp,
  latestRoundId
) => {
  const aggregatorContract = {
    address: contractAddress,
    abi: AccessControlledOffchainAggregator,
  } as const;

  let low = BigInt(0);
  let high = BigInt(Number(latestRoundId));

  let closestTimestamp = null;
  let closestRoundId = null;

  while (low <= high) {
    const mid = low + (high - low) / BigInt(2);

    let timestamp;
    try {
      timestamp = await client.readContract({
        ...aggregatorContract,
        functionName: "getTimestamp",
        args: [mid.toString()],
      });
    } catch (error) {
      low = mid + BigInt(1);
      continue;
    }

    if (timestamp) {
      const midTimestamp = BigInt(timestamp);

      // If it's the first timestamp found or it's closer than the previous closest timestamp
      if (
        closestTimestamp === null ||
        Math.abs(Number(midTimestamp) - Number(targetTimestamp)) <
          Math.abs(Number(closestTimestamp) - Number(targetTimestamp))
      ) {
        closestTimestamp = midTimestamp;
        closestRoundId = mid;
      }

      if (midTimestamp < targetTimestamp) {
        low = mid + BigInt(1);
      } else {
        high = mid - BigInt(1);
      }
    } else {
      low = mid + BigInt(1);
    }
  }

  // Return the closest timestamp and its roundId, or an error if none were found
  if (closestRoundId !== null) {
    return { roundId: closestRoundId, timestamp: closestTimestamp };
  } else {
    return { error: "No timestamp found" };
  }
};
