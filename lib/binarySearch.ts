import AccessControlledOffchainAggregator from "../abi/EACAggregatorProxy.json";
import { PROXIMITY } from "./constants";

export const binarySearchRoundId = async (
  client,
  contractAddress,
  targetTimestamp,
  latestRoundId,
  proximity = PROXIMITY
) => {
  const aggregatorContract = {
    address: contractAddress,
    abi: AccessControlledOffchainAggregator,
  } as const;

  let low = BigInt(0);
  let high = BigInt(Number(latestRoundId));

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

      // Check if the absolute difference is within the proximity
      if (
        Math.abs(Number(midTimestamp) - Number(targetTimestamp)) <= proximity
      ) {
        return { roundId: mid, timestamp: midTimestamp };
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

  // If the function hasn't returned by this point, no match within the desired proximity was found
  return { error: "No match found within the desired proximity" };
};
