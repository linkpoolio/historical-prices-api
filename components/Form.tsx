// Form.js
import React, { useState } from "react";
import {
  Box,
  Button,
  useColorModeValue,
  Heading,
  Flex,
} from "@chakra-ui/react";
import "react-datepicker/dist/react-datepicker.css";
import {
  validateContractAddress,
  validateChain,
} from "../lib/inputValidations";
import { ContractAddressInput } from "./ContractAddressInput";
import { ChainInput } from "./ChainInput";
import { ModeInput } from "./ModeInput";
import { DateInput } from "./DateInput";

function Form({ fetchData, isLoading }) {
  const [contractAddress, setContractAddress] = useState("");
  const [chain, setChain] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [singleDate, setSingleDate] = useState(new Date());
  const [mode, setMode] = useState("single");

  const [contractAddressError, setContractAddressError] = useState("");
  const [chainError, setChainError] = useState("");
  const [dateError, setDateError] = useState("");

  const validateInputs = () => {
    let isValid = true;

    const contractAddressValidation = validateContractAddress(contractAddress);
    const chainValidation = validateChain(chain);

    if (contractAddressValidation.error) {
      setContractAddressError(contractAddressValidation.error.message);
      isValid = false;
    } else {
      setContractAddressError("");
    }

    if (chainValidation.error) {
      setChainError(chainValidation.error.message);
      isValid = false;
    } else {
      setChainError("");
    }

    const currentDate = new Date();

    if (mode === "single" && singleDate > currentDate) {
      setDateError("Date cannot be in the future");
      isValid = false;
    } else if (
      mode === "range" &&
      (startDate > currentDate || endDate > currentDate)
    ) {
      setDateError("Start date or end date cannot be in the future");
      isValid = false;
    } else if (mode === "single" && !singleDate) {
      setDateError("Date is required");
      isValid = false;
    } else if (mode === "range" && (!startDate || !endDate)) {
      setDateError("Both start date and end date are required");
      isValid = false;
    } else {
      setDateError("");
    }

    return isValid;
  };

  const handleFetchData = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      fetchData(contractAddress, chain, mode, singleDate, startDate, endDate);
    } catch (err) {
      console.log(err);
    }
  };

  const backgroundColor = useColorModeValue("gray.100", "gray.100");
  const color = useColorModeValue("black", "white");

  return (
    <Box
      flex="1"
      minHeight="60vh"
      padding={4}
      backgroundColor={backgroundColor}
      color={color}
      display="flex"
      flexDirection="column"
    >
      <Heading
        display={{ base: "none", md: "inline" }}
        as="h1"
        size="md"
        color="brand.primary"
        fontSize="lg"
      >
        Request Parameters
      </Heading>
      <ContractAddressInput
        contractAddress={contractAddress}
        setContractAddress={setContractAddress}
        contractAddressError={contractAddressError}
      />
      <ChainInput chain={chain} setChain={setChain} chainError={chainError} />
      <ModeInput mode={mode} setMode={setMode} />
      <DateInput
        mode={mode}
        singleDate={singleDate}
        setSingleDate={setSingleDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        dateError={dateError}
      />
      <Flex direction="column" marginTop="auto">
        <Button
          variant="default"
          isLoading={isLoading}
          loadingText={isLoading ? "Loading..." : "Fetch Data"}
          onClick={handleFetchData}
        >
          Fetch Data
        </Button>
      </Flex>
    </Box>
  );
}

export default Form;
