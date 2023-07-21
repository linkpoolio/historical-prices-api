import AccessControlledOffchainAggregator from "../abi/EACAggregatorProxy.json";
import { PROXIMITY } from "./constants";

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

  let closestRoundId = null;
  let closestTimestamp = null;

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

      // Store the closest timestamp and round id found so far
      if (
        (closestTimestamp === null ||
          targetTimestamp - midTimestamp <
            targetTimestamp - closestTimestamp) &&
        midTimestamp <= targetTimestamp
      ) {
        closestRoundId = mid;
        closestTimestamp = midTimestamp;
      }

      if (midTimestamp <= targetTimestamp) {
        low = mid + BigInt(1);
      } else {
        high = mid - BigInt(1);
      }
    } else {
      low = mid + BigInt(1);
    }
  }

  // If a closest timestamp was found, return it
  if (closestTimestamp !== null) {
    return { roundId: closestRoundId, timestamp: closestTimestamp };
  }

  // If the function hasn't returned by this point, no match was found
  return { error: "No match found" };
};
