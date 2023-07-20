import React from "react";
import {
  Select,
  FormLabel,
  FormControl,
  FormErrorMessage,
} from "@chakra-ui/react";
import { SUPPORTED_CHAINS } from "../lib/constants";

export const ChainInput = ({ chain, setChain, chainError }) => {
  return (
    <FormControl isInvalid={!!chainError}>
      <FormLabel mt={{ base: "4", md: "4", lg: "4" }}>Chain</FormLabel>
      <Select
        placeholder="Select Chain"
        onChange={(e) => setChain(e.target.value)}
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain} value={chain}>
            {chain}
          </option>
        ))}
      </Select>
      <FormErrorMessage>{chainError}</FormErrorMessage>
    </FormControl>
  );
};
