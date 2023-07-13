import EACAggregatorProxy from "../../abi/EACAggregatorProxy.json";
import { getClient } from "../../lib/client";
import {
  validateContractAddress,
  validateChain,
  validateTimestamps,
} from "../../lib/inputValidations";
import { STATUS_CODE, CHUNK_SIZE } from "../../lib/constants";

const binarySearchRoundId = async (
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
        return mid;
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
      }
    } else {
      low = mid + BigInt(1);
    }
  }

  return closest;
};

export default async function handler(req, res) {
  const { contractAddress, startTimestamp, endTimestamp, chain } = req.query;

  let validationResult;

  validationResult = validateContractAddress(contractAddress);
  if (validationResult.error) {
    return res.status(validationResult.status).json(validationResult.error);
  }
  const { validatedContractAddress } = validationResult;

  validationResult = validateChain(chain);
  if (validationResult.error) {
    return res.status(validationResult.status).json(validationResult.error);
  }
  const { validatedChain } = validationResult;

  validationResult = validateTimestamps(startTimestamp, endTimestamp);
  if (validationResult.error) {
    return res.status(validationResult.status).json(validationResult.error);
  }
  const { validatedStartTimestamp, validatedEndTimestamp } = validationResult;

  const publicClient = getClient(validatedChain);
  if (publicClient.error) {
    return res.status(publicClient.status).json(publicClient.error);
  }

  const startTimestampBigInt = BigInt(validatedStartTimestamp);
  const endTimestampBigInt = BigInt(validatedEndTimestamp);

  const aggregatorContract = {
    address: validatedContractAddress,
    abi: EACAggregatorProxy,
  } as const;

  let latestRoundData, description, decimals;
  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          ...aggregatorContract,
          functionName: "latestRoundData",
        },
        {
          ...aggregatorContract,
          functionName: "description",
        },
        {
          ...aggregatorContract,
          functionName: "decimals",
        },
      ],
    });
    latestRoundData = results[0].result;
    description = results[1].result;
    decimals = results[2].result;
  } catch (error) {
    return res.status(STATUS_CODE.INTERNAL_ERROR).json({
      errorCode: "FAILED_TO_FETCH_ROUND_DATA",
      message: `Failed to get latest round data from contract ${validatedContractAddress}: ${error.message}.`,
    });
  }

  let startRoundId = await binarySearchRoundId(
    publicClient,
    validatedContractAddress,
    startTimestampBigInt
  );
  let endRoundId = await binarySearchRoundId(
    publicClient,
    validatedContractAddress,
    endTimestampBigInt
  );

  if (startRoundId > endRoundId) {
    [startRoundId, endRoundId] = [endRoundId, startRoundId];
  }

  const totalRounds = endRoundId - startRoundId + 1n;
  const totalChunks =
    Number(totalRounds / BigInt(CHUNK_SIZE)) +
    (totalRounds % BigInt(CHUNK_SIZE) === 0n ? 0 : 1);

  let rounds = [];

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const chunkStartRoundId = startRoundId + BigInt(chunkIndex * CHUNK_SIZE);
    const chunkEndRoundId =
      chunkStartRoundId + BigInt(CHUNK_SIZE - 1) < endRoundId
        ? chunkStartRoundId + BigInt(CHUNK_SIZE - 1)
        : endRoundId;

    const roundIdsToFetch = Array.from(
      { length: Number(chunkEndRoundId - chunkStartRoundId + 1n) },
      (_, i) => chunkStartRoundId + BigInt(i)
    );

    const contracts = roundIdsToFetch.map((roundId) => ({
      ...aggregatorContract,
      functionName: "getRoundData",
      args: [roundId.toString()],
    }));

    let roundDataResults;
    try {
      roundDataResults = await publicClient.multicall({
        contracts,
      });
    } catch (error) {
      return res.status(STATUS_CODE.INTERNAL_ERROR).json({
        errorCode: "FAILED_TO_FETCH_ROUND_DATA",
        message: `Failed to get round data from contract ${validatedContractAddress}. RPC might be overloaded. ${error.message}`,
      });
    }

    rounds = [
      ...rounds,
      ...roundDataResults
        .filter((result) => !result.error)
        .map((result, i) => {
          const roundData = result.result;
          const roundTimestamp = BigInt(roundData[3]);
          const roundPrice = roundData[1];

          return {
            roundId: roundIdsToFetch[i].toString(),
            description: description,
            answer: roundPrice.toString(),
            decimals: decimals.toString(),
            startedAt: roundData[2].toString(),
            updatedAt: roundTimestamp.toString(),
          };
        }),
    ];
  }

  if (rounds.length > 0) {
    return res.status(STATUS_CODE.OK).json(rounds);
  }

  return res.status(STATUS_CODE.NOT_FOUND).json({
    errorCode: "NO_ROUND_FOUND",
    message: `No round found for timestamps ${validatedStartTimestamp} to ${validatedEndTimestamp} in contract ${validatedContractAddress}.`,
  });
}
