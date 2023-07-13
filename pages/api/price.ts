import EACAggregatorProxy from "../../abi/EACAggregatorProxy.json";
import AccessControlledOffchainAggregator from "../../abi/AccessControlledOffchainAggregator.json";
import { getClient } from "../../lib/client";
import { validateInput } from "../../lib/inputValidations";
import { STATUS_CODE } from "../../lib/constants";
import { formatDate } from "../../lib/date";
import { getStartPhaseData } from "../../lib/getStartPhaseData";

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
        const roundData = await publicClient.readContract({
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
          timestamp: formatDate(roundData[3].toString()),
        };

        // Save the round data
        // if the round timestamp of the new round is equal or less than the last roundsData timestamp, skip it

        if (roundsData.length > 0) {
          const lastRoundTimestamp = BigInt(
            Math.floor(
              roundsData[roundsData.length - 1].timestamp.getTime() / 1000
            )
          );
          if (roundTimestamp <= lastRoundTimestamp) {
            currentRoundId++;
            continue;
          }
        }

        roundsData.push(responseRoundData);

        // Update the current round Id
        currentRoundId++;
        // If the current round Id exceeds the latest round Id of the current phase,
        // switch to the next phase and reset the round Id
        if (
          currentRoundId >
          phaseAggregatorContracts[currentPhaseId - 1].latestRoundId
        ) {
          currentPhaseId++;
          currentRoundId = 1;
          // Break the loop if there's no next phase
          if (currentPhaseId > phaseAggregatorContracts.length) {
            break;
          }
        }
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
