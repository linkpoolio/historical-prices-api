import EACAggregatorProxy from "../../abi/EACAggregatorProxy.json";
import AccessControlledOffchainAggregator from "../../abi/AccessControlledOffchainAggregator.json";
import { getClient } from "../../lib/client";
import { validateInput } from "../../lib/inputValidations";
import { STATUS_CODE } from "../../lib/constants";
import { formatDate } from "../../lib/date";
import { getStartPhaseData } from "../../lib/getStartPhaseData";
import { binarySearchRoundId } from "../../lib/binarySearch";
import { logger } from "../../lib/logger";

export default async function handler(req, res) {
  const { contractAddress, startTimestamp, endTimestamp, chain } = req.query;

  logger.info(
    `Received request with parameters: contractAddress=${contractAddress}, startTimestamp=${startTimestamp}, endTimestamp=${endTimestamp}, chain=${chain}`
  );

  const {
    validatedContractAddress,
    validatedChain,
    validatedStartTimestamp,
    validatedEndTimestamp,
    error: validationError,
    status: validationStatus,
  } = validateInput(contractAddress, chain, startTimestamp, endTimestamp);

  if (validationError) {
    logger.error(`Input validation error: ${validationError}`);
    return res.status(validationStatus).json(validationError);
  }

  const publicClient = getClient(validatedChain);
  if (publicClient.error) {
    logger.error(
      `Failed to get client for chain ${validatedChain}: ${publicClient.error}`
    );
    return res.status(publicClient.status).json(publicClient.error);
  }

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
      validatedStartTimestamp,
      publicClient
    );

    if (!startPhaseData) {
      logger.error(
        `Failed to get phase data from contract ${validatedContractAddress}`
      );
      return res.status(STATUS_CODE.INTERNAL_ERROR).json({
        errorCode: "FAILED_TO_FETCH_PHASE_DATA",
        message: `Failed to get phase data from contract ${validatedContractAddress}.`,
      });
    }

    logger.info(`Starting to fetch round data for pair ${description}...`);

    const { phaseId, roundId } = startPhaseData;
    startPhaseId = phaseId;
    startRoundId = roundId;

    // CASE 1: If the start timestamp is the same as the end timestamp, we only need to fetch one round
    if (startTimestamp == endTimestamp) {
      const result = await publicClient.readContract({
        address: phaseAggregatorContracts[startPhaseData.phaseId - 1].address,
        abi: AccessControlledOffchainAggregator,
        functionName: "getRoundData",
        args: [startPhaseData.roundId.toString()],
      });
      const responseRoundData = {
        phaseId: phaseId.toString(),
        roundId: roundId.toString(),
        answer: result[1].toString(),
        timestamp: formatDate(result[3].toString()),
      };
      logger.info("Completed fetching round data successfully");
      return res.status(STATUS_CODE.OK).json({
        description,
        decimals,
        rounds: [responseRoundData],
      });
    }

    // CASE 2: If the start timestamp is before the end timestamp, we need to fetch multiple rounds

    // Now that the start phase data is found, we can start fetching the rounds up until the end timestamp. We can't use multicall.

    let currentPhaseId = startPhaseId;
    let currentRoundId = startRoundId;
    let currentRoundData;
    let roundsData = [];

    for (let i = 0; i < phaseAggregatorContracts.length; i++) {
      const phaseAggregatorContract = phaseAggregatorContracts[i];

      // Skip if not the current phase
      if (phaseAggregatorContract.phaseId != currentPhaseId) {
        continue;
      }

      while (true) {
        // Continuously fetch rounds
        try {
          currentRoundData = await publicClient.readContract({
            address: phaseAggregatorContract.address,
            abi: AccessControlledOffchainAggregator,
            functionName: "getRoundData",
            args: [currentRoundId.toString()],
          });
        } catch (error) {
          break; // No more rounds, break inner loop
        }

        currentRoundData = {
          roundId: currentRoundData[0],
          answer: currentRoundData[1],
          timestamp: currentRoundData[3],
        };

        const formattedRoundData = {
          phaseId: currentPhaseId.toString(),
          roundId: currentRoundId.toString(),
          answer: currentRoundData.answer.toString(),
          timestamp: formatDate(currentRoundData.timestamp.toString()),
        };

        roundsData.push(formattedRoundData);

        if (currentRoundData.roundId == phaseAggregatorContract.latestRoundId) {
          break; // We reached the latest round for this phase
        }

        if (currentRoundData.timestamp >= validatedEndTimestamp) {
          break; // We reached the end timestamp
        }

        currentRoundId++; // Proceed to next round in the same phase
      }

      // Preparing to go to the next phase
      currentPhaseId++;
      if (phaseAggregatorContracts[i + 1]) {
        const { roundId } = await binarySearchRoundId(
          publicClient,
          phaseAggregatorContracts[i + 1].address,
          currentRoundData.timestamp,
          phaseAggregatorContracts[i + 1].latestRoundId
        );
        currentRoundId = roundId;
      }
    }

    logger.info("Completed fetching round data successfully");
    return res.status(STATUS_CODE.OK).json({
      description,
      decimals,
      rounds: roundsData,
    });
  } catch (error) {
    logger.error(
      `Failed to get phase data from contract ${validatedContractAddress}: ${error.message}`
    );
    return res.status(STATUS_CODE.INTERNAL_ERROR).json({
      errorCode: "FAILED_TO_FETCH_PHASE_DATA",
      message: `Failed to get phase data from contract ${validatedContractAddress}: ${error.message}.`,
    });
  }
}
