import EACAggregatorProxy from "../../abi/EACAggregatorProxy.json";
import AccessControlledOffchainAggregator from "../../abi/AccessControlledOffchainAggregator.json";
import { getClient } from "../../lib/client";
import { validateInput } from "../../lib/inputValidations";
import { STATUS_CODE } from "../../lib/constants";
import { getStartPhaseData } from "../../lib/getStartPhaseData";
import { binarySearchRoundId } from "../../lib/binarySearch";

export default async function handler(req, res) {
  const { contractAddress, startTimestamp, endTimestamp, chain } = req.query;

  const {
    validatedContractAddress,
    validatedChain,
    validatedStartTimestamp,
    validatedEndTimestamp,
    error: validationError,
    status: validationStatus,
  } = validateInput(contractAddress, chain, startTimestamp, endTimestamp);

  if (validationError) {
    return res.status(validationStatus).json(validationError);
  }

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

  let phaseAggregatorContracts;
  let description, decimals;

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
    description = results[1].result;
    decimals = results[2].result;
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
      return res.status(STATUS_CODE.INTERNAL_ERROR).json({
        errorCode: "FAILED_TO_FETCH_PHASE_DATA",
        message: `Failed to get phase data from contract ${validatedContractAddress}.`,
      });
    }

    const { phaseId, roundId } = startPhaseData;
    startPhaseId = phaseId;
    startRoundId = roundId;

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

        roundsData.push(responseRoundData);

        console.log("Pushed round data: ", responseRoundData);

        // break the loop if the we reached the last round and the last phase
        if (
          currentRoundId ===
            phaseAggregatorContracts[currentPhaseId - 1].latestRoundId &&
          currentPhaseId === phaseAggregatorContracts.length
        ) {
          break;
        }

        if (
          currentRoundId ===
          phaseAggregatorContracts[currentPhaseId - 1].latestRoundId
        ) {
          let error = true;
          let roundId;

          while (error) {
            ({ roundId, error } = await binarySearchRoundId(
              publicClient,
              phaseAggregatorContracts[currentPhaseId].address,
              roundData[3],
              phaseAggregatorContracts[currentPhaseId].latestRoundId
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

          currentRoundId = roundId;
          currentPhaseId++;
        }

        currentRoundId++;
      }

      // Return the rounds data
      return res
        .status(STATUS_CODE.OK)
        .json({ description, decimals, rounds: roundsData });
    } catch (error) {
      return res.status(STATUS_CODE.INTERNAL_ERROR).json({
        errorCode: "FAILED_TO_FETCH_ROUNDS_DATA",
        message: `Failed to get rounds data from contract ${validatedContractAddress}: ${error.message}.`,
      });
    }
  } catch (error) {
    return res.status(STATUS_CODE.INTERNAL_ERROR).json({
      errorCode: "FAILED_TO_FETCH_PHASE_DATA",
      message: `Failed to get phase data from contract ${validatedContractAddress}: ${error.message}.`,
    });
  }
}
