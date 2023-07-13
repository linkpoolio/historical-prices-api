import EACAggregatorProxy from "../abi/EACAggregatorProxy.json";
import { getClient } from "../lib/client";
import {
  validateContractAddress,
  validateChain,
  validateTimestamps,
} from "../lib/inputValidations";
import { STATUS_CODE, CHUNK_SIZE } from "../lib/constants";
import { binarySearchRoundId } from "../lib/binarySearch";
import { formatDate } from "../lib/date";

type Response = {
  status: number;
  data?: Data | Data[];
  error?: Error;
};
type Data = {
  roundId: string;
  description: string;
  answer: string;
  decimals: string;
  startedAt: Date;
  updatedAt: Date;
};

type ValidationResult = {
  error?: Error;
  validatedContractAddress?: string;
  validatedChain?: string;
  validatedStartTimestamp?: number;
  validatedEndTimestamp?: number;
};

type Error = {
  errorCode: string;
  message: string;
};

export const getRoundsByTimestamp = async (
  contractAddress: string,
  startTimestamp: string,
  endTimestamp: string,
  chain: string
): Promise<Response> => {
  const {
    error,
    validatedContractAddress,
    validatedChain,
    validatedStartTimestamp,
    validatedEndTimestamp,
  } = validateInputs(contractAddress, chain, startTimestamp, endTimestamp);

  if (error) {
    return errorResponse(
      STATUS_CODE.INTERNAL_ERROR,
      error.errorCode,
      error.message
    );
  }

  const publicClient = getClient(validatedChain);
  if (publicClient.error) {
    return {
      status: publicClient.status,
      error: publicClient.error,
    };
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
    return {
      status: STATUS_CODE.INTERNAL_ERROR,
      error: {
        errorCode: "FAILED_TO_FETCH_ROUND_DATA",
        message: `Failed to get latest round data from contract ${validatedContractAddress}: ${error.message}.`,
      },
    };
  }

  if (startTimestamp.toString() == endTimestamp.toString()) {
    let round;
    try {
      round = await binarySearchRoundId(
        publicClient,
        validatedContractAddress,
        startTimestampBigInt
      );
      return {
        status: STATUS_CODE.OK,
        data: {
          roundId: round.roundId.toString(),
          description,
          answer: round.roundData[0].toString(),
          decimals,
          startedAt: formatDate(round.roundData[2]),
          updatedAt: formatDate(round.roundData[3]),
        },
      };
    } catch (error) {
      return {
        status: STATUS_CODE.INTERNAL_ERROR,
        error: {
          errorCode: "FAILED_TO_FETCH_ROUND_DATA",
          message: `Failed to get round id for timestamp ${startTimestampBigInt} from contract ${validatedContractAddress}: ${error.message}`,
        },
      };
    }
  }

  let startRound = await binarySearchRoundId(
    publicClient,
    validatedContractAddress,
    startTimestampBigInt
  );

  let endRound = await binarySearchRoundId(
    publicClient,
    validatedContractAddress,
    endTimestampBigInt
  );

  let startRoundId = startRound.roundId;
  let endRoundId = endRound.roundId;

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
      return {
        status: STATUS_CODE.INTERNAL_ERROR,
        error: {
          errorCode: "FAILED_TO_FETCH_ROUND_DATA",
          message: `Failed to get round data from contract ${validatedContractAddress}. RPC might be overloaded. ${error.message}`,
        },
      };
    }

    rounds = [
      ...rounds,
      ...roundDataResults
        .filter((result) => !result.error)
        .map((result, i) => {
          const roundData = result.result;
          const roundTimestamp = roundData[3];
          const roundPrice = roundData[1];

          return {
            roundId: roundIdsToFetch[i].toString(),
            description: description,
            answer: roundPrice.toString(),
            decimals: decimals.toString(),
            startedAt: formatDate(roundData[2]),
            updatedAt: formatDate(roundTimestamp),
          };
        }),
    ];
  }

  if (rounds.length > 0) {
    return {
      status: STATUS_CODE.OK,
      data: rounds,
    };
  }
  return {
    status: STATUS_CODE.INTERNAL_ERROR,
    error: {
      errorCode: "NO_ROUND_FOUND",
      message: `No round found for timestamps ${validatedStartTimestamp} to ${validatedEndTimestamp} in contract ${validatedContractAddress}.`,
    },
  };
};

const validateInputs = (
  contractAddress: string,
  chain: string,
  startTimestamp: string,
  endTimestamp: string
): ValidationResult => {
  const validationResultContract = validateContractAddress(contractAddress);
  if (validationResultContract.error) {
    return validationResultContract;
  }

  const validationResultChain = validateChain(chain);
  if (validationResultChain.error) {
    return validationResultChain;
  }

  const validationResultTimestamps = validateTimestamps(
    parseInt(startTimestamp, 10),
    parseInt(endTimestamp, 10)
  );
  if (validationResultTimestamps.error) {
    return validationResultTimestamps;
  }

  return {
    ...validationResultContract,
    ...validationResultChain,
    ...validationResultTimestamps,
  };
};

const errorResponse = (
  status: number,
  errorCode: string,
  message: string
): Response => ({
  status,
  error: {
    errorCode,
    message,
  },
});
