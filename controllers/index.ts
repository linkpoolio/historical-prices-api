import EACAggregatorProxy from "../abi/EACAggregatorProxy.json";
import AccessControlledOffchainAggregator from "../abi/AccessControlledOffchainAggregator.json";
import { getClient } from "../lib/client";
import {
  validateContractAddress,
  validateChain,
  validateTimestamps,
} from "../lib/inputValidations";
import { STATUS_CODE } from "../lib/constants";
import { binarySearchRoundId } from "../lib/binarySearch";
import { getStartPhaseData } from "../lib/getStartPhaseDate";

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

  let phaseAggregatorContracts;

  try {
    const results = await publicClient.multicall({
      contracts: [
        {
          ...aggregatorContract,
          functionName: "phaseId",
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
    // Create phaseAggregatorIds array by knowing that the phasedId is the latest Id and the Ids are sequential and start from 1
    const phaseAggregatorIds = Array.from(
      { length: Number(results[0].result) },
      (_, i) => i + 1
    );
    // Create another multicall to get the aggregator address for each phaseId
    const phaseAggregatorAddressResults = await publicClient.multicall({
      contracts: phaseAggregatorIds.map((id) => {
        return {
          ...aggregatorContract,
          functionName: "phaseAggregators",
          args: [id.toString()],
        };
      }),
    });
    // Create an array of objects with the phaseId and the aggregator address
    phaseAggregatorContracts = phaseAggregatorAddressResults.map(
      (result, index) => {
        return {
          phaseId: phaseAggregatorIds[index],
          address: result.result,
        };
      }
    );
    for (const phaseAggregatorContract of phaseAggregatorContracts) {
      try {
        const data = await publicClient.readContract({
          address: phaseAggregatorContract.address,
          abi: AccessControlledOffchainAggregator,
          functionName: "latestRound",
        });
        phaseAggregatorContract.latestRoundId = data;
      } catch (error) {
        continue;
      }
    }

    let startPhaseId, startRoundId;

    // Now use the helper function in your main code:
    const startPhaseData = await getStartPhaseData(
      phaseAggregatorContracts,
      startTimestampBigInt,
      publicClient
    );

    if (!startPhaseData) {
      return {
        status: STATUS_CODE.INTERNAL_ERROR,
        error: {
          errorCode: "FAILED_TO_FETCH_PHASE_DATA",
          message: `Failed to get phase data from contract ${validatedContractAddress}.`,
        },
      };
    }

    const { phaseId, roundId } = startPhaseData;
    startPhaseId = phaseId;
    startRoundId = roundId;

    console.log(startPhaseData);

    // Now that the start phase data is found, we can start fetching the rounds up until the end timestamp. We can't use multicall.

    let currentPhaseId = startPhaseId;
    let currentRoundId = startRoundId;
    let roundsData = [];

    try {
      while (true) {
        let roundData;
        roundData = await publicClient.readContract({
          address: phaseAggregatorContracts[currentPhaseId - 1].address,
          abi: AccessControlledOffchainAggregator,
          functionName: "getRoundData",
          args: [currentRoundId.toString()],
        });

        const roundTimestamp = BigInt(roundData[2]);
        // Break the loop if the current round's timestamp exceeds the end timestamp
        if (roundTimestamp > endTimestampBigInt) {
          break;
        }

        const responseRoundData = {
          phaseId: currentPhaseId.toString(),
          roundId: currentRoundId.toString(),
          answer: roundData[1].toString(),
          timestamp: new Date(Number(roundData[3].toString()) * 1000),
        };

        console.log(responseRoundData);

        // Save the round data
        // if the round timestamp of the new round is equal or less than the last roundsData timestamp, skip it

        // if (roundsData.length > 0) {
        //   const lastRoundTimestamp = BigInt(
        //     Math.floor(
        //       roundsData[roundsData.length - 1].timestamp.getTime() / 1000
        //     )
        //   );
        //   if (roundTimestamp <= lastRoundTimestamp) {
        //     currentRoundId++;
        //     continue;
        //   }
        // }

        roundsData.push(responseRoundData);

        // Update the current round Id
        // currentRoundId++;
        // If the current round Id exceeds the latest round Id of the current phase,
        // switch to the next phase and reset the round Id

        // If the round id equals the latest round id of the current phase, move to the next phase and reset the round id
        if (
          currentRoundId ===
          phaseAggregatorContracts[currentPhaseId - 1].latestRoundId
        ) {
          // Find the round id of the next phase by using the binary search algorithm

          console.log({
            1: phaseAggregatorContracts[currentPhaseId].address,
            2: roundData[3],
            3: phaseAggregatorContracts[currentPhaseId].latestRoundId,
          });

          let roundId: bigint;
          let error: string;

          while (error) {
            ({ roundId, error } = await binarySearchRoundId(
              publicClient,
              phaseAggregatorContracts[currentPhaseId].address,
              roundData[3],
              phaseAggregatorContracts[currentPhaseId].latestRoundId,
              10000
            ));

            // If an error still exists, print the error message and increment the currentPhaseId.
            if (error) {
              console.log("Error occurred in phaseId: ", currentPhaseId);
              currentPhaseId++;

              // Check if we've gone through all the contracts.
              if (currentPhaseId >= phaseAggregatorContracts.length) {
                console.error(
                  "All contracts have been searched, no valid roundId found."
                );
                break;
              }
            }
          }
          console.log(error);
          console.log(roundId);
          currentRoundId = roundId;
          currentPhaseId++;
        }
        currentRoundId++;
      }

      // Return the rounds data
      return {
        status: STATUS_CODE.OK,
        data: roundsData,
      };
    } catch (error) {
      return {
        status: STATUS_CODE.INTERNAL_ERROR,
        error: {
          errorCode: "FAILED_TO_FETCH_ROUNDS_DATA",
          message: `Failed to get rounds data from contract ${validatedContractAddress}: ${error.message}.`,
        },
      };
    }
  } catch (error) {
    return {
      status: STATUS_CODE.INTERNAL_ERROR,
      error: {
        errorCode: "FAILED_TO_FETCH_PHASE_DATA",
        message: `Failed to get phase data from contract ${validatedContractAddress}: ${error.message}.`,
      },
    };
  }
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
