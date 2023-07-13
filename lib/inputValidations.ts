import { isAddress } from "viem";
import { SUPPORTED_CHAINS, STATUS_CODE } from "./constants";

export function validateContractAddress(contractAddress) {
  if (!contractAddress || !isAddress(contractAddress)) {
    return {
      status: STATUS_CODE.BAD_REQUEST,
      error: {
        errorCode: "INVALID_CONTRACT_ADDRESS",
        message: `Invalid contract address ${contractAddress}.`,
      },
    };
  }

  return { validatedContractAddress: contractAddress };
}

export function validateChain(chain) {
  if (!chain || !SUPPORTED_CHAINS.includes(chain)) {
    return {
      status: STATUS_CODE.BAD_REQUEST,
      error: {
        errorCode: "UNSUPPORTED_CHAIN",
        message: `Chain name ${chain} is not supported. Supported chains are: ${SUPPORTED_CHAINS.join(
          ", "
        )}.`,
      },
    };
  }

  return { validatedChain: chain };
}

export function validateTimestamps(startTimestamp, endTimestamp) {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (
    (startTimestamp && startTimestamp > currentTimestamp) ||
    endTimestamp < startTimestamp
  ) {
    return {
      status: STATUS_CODE.BAD_REQUEST,
      error: {
        errorCode: "INVALID_START_TIMESTAMP",
        message: `Start timestamp ${startTimestamp} is in the future or end timestamp ${endTimestamp} is before start timestamp.`,
      },
    };
  }

  return {
    validatedStartTimestamp: startTimestamp,
    validatedEndTimestamp: endTimestamp,
  };
}
