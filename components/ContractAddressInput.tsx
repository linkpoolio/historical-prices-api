import React from "react";
import {
  Input,
  FormLabel,
  FormControl,
  FormErrorMessage,
} from "@chakra-ui/react";

export const ContractAddressInput = ({
  contractAddress,
  setContractAddress,
  contractAddressError,
}) => {
  return (
    <FormControl isInvalid={!!contractAddressError}>
      <FormLabel mt={{ base: "4", md: "4", lg: "4" }}>
        Contract Address
      </FormLabel>
      <Input
        placeholder="Contract Address"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
      />
      <FormErrorMessage>{contractAddressError}</FormErrorMessage>
    </FormControl>
  );
};
