import React, { useState } from "react";
import {
  Box,
  Input,
  Button,
  Flex,
  RadioGroup,
  Stack,
  Radio,
  useColorModeValue,
  Heading,
  FormLabel,
  Select,
  FormControl,
  FormErrorMessage,
  Spacer,
  Text,
  Spinner,
} from "@chakra-ui/react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { SUPPORTED_CHAINS } from "../lib/constants";
import {
  validateContractAddress,
  validateChain,
} from "../lib/inputValidations";

function Dashboard() {
  const [contractAddress, setContractAddress] = useState("");
  const [chain, setChain] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [singleDate, setSingleDate] = useState(new Date());
  const [responseData, setResponseData] = useState(null);
  const [mode, setMode] = useState("single");
  const [isLoading, setIsLoading] = useState(false);

  const [contractAddressError, setContractAddressError] = useState("");
  const [chainError, setChainError] = useState("");
  const [dateError, setDateError] = useState("");

  const [error, setError] = useState(null);

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

  const fetchData = async () => {
    if (!validateInputs()) {
      return;
    }
    setResponseData(null);
    setIsLoading(true);

    try {
      let response;

      if (mode === "single") {
        response = await axios.get("/api/price", {
          params: {
            contractAddress: contractAddress,
            chain,
            startTimestamp: singleDate.getTime() / 1000,
            endTimestamp: singleDate.getTime() / 1000,
          },
        });
      } else {
        response = await axios.get("/api/price", {
          params: {
            contractAddress: contractAddress,
            chain,
            startTimestamp: startDate.getTime() / 1000,
            endTimestamp: endDate.getTime() / 1000,
          },
        });
      }

      setResponseData(response.data);
      setError(null); // clear any previous error
    } catch (err) {
      setError(err); // store the error message
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!responseData.rounds || responseData.rounds.length === 0) {
      console.log("No data to download");
      return;
    }

    let csvData = responseData.rounds.map((round) => {
      return Object.keys(round)
        .map((key) => {
          return `"${round[key]}"`;
        })
        .join(",");
    });

    const keys = Object.keys(responseData.rounds[0]);

    csvData.unshift(keys.join(",")); // Add the headers to the first line

    const csvString = csvData.join("\r\n"); // Join all lines with newline

    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
    link.target = "_blank";
    link.download = "data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const backgroundColor = useColorModeValue("gray.100", "gray.100");
  const color = useColorModeValue("black", "white");

  return (
    <Flex
      width="100%"
      height="100vh"
      padding={{
        base: "50",
        md: "50",
        lg: "100",
      }} // padding between the dashboard and the edges of the screen
      align="center"
      justify="center"
      gap="50" // padding between both parts of the dashboard
    >
      <Box
        flex="1"
        minHeight="60vh"
        padding={4}
        backgroundColor={backgroundColor}
        color={color}
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
        <FormControl isInvalid={!!contractAddressError}>
          <FormLabel
            mt={{
              base: "4",
              md: "4",
              lg: "4",
            }}
          >
            Contract Address
          </FormLabel>
          <Input
            placeholder="Contract Address"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
          />
          <FormErrorMessage>{contractAddressError}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={!!chainError}>
          <FormLabel
            mt={{
              base: "4",
              md: "4",
              lg: "4",
            }}
          >
            Chain
          </FormLabel>
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
        <FormLabel
          mt={{
            base: "4",
            md: "4",
            lg: "4",
          }}
        >
          Mode
        </FormLabel>
        <RadioGroup onChange={setMode} value={mode}>
          <Stack direction="row">
            <Radio value="single">Single Date</Radio>
            <Radio value="range">Date Range</Radio>
          </Stack>
        </RadioGroup>
        <FormLabel
          mt={{
            base: "4",
            md: "4",
            lg: "4",
          }}
        >
          Date
        </FormLabel>
        {mode === "single" && (
          <DatePicker
            selected={singleDate}
            onSelect={(date) => setSingleDate(date)}
            showTimeSelect
            dateFormat="Pp"
          />
        )}
        {mode === "range" && (
          <>
            <DatePicker
              selected={startDate}
              onSelect={(date) => setStartDate(date)}
              showTimeSelect
              startDate={startDate}
              endDate={endDate}
            />
            <Spacer />

            <DatePicker
              selected={endDate}
              onSelect={(date) => setEndDate(date)}
              showTimeSelect
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
            />
          </>
        )}
        {dateError && (
          <Text
            color={{
              base: "red.500",
            }}
          >
            {dateError}
          </Text>
        )}

        <Button onClick={fetchData}>Fetch Data</Button>
      </Box>
      <Box
        flex="1"
        minHeight="60vh"
        maxHeight="60vh"
        backgroundColor={backgroundColor}
        color={color}
        padding={4}
      >
        <Heading
          display={{ base: "none", md: "inline" }}
          as="h1"
          size="md"
          color="brand.primary"
          fontSize="lg"
        >
          Response
        </Heading>
        <Box overflowY={"auto"} maxHeight={"50vh"}>
          {isLoading ? (
            <Spinner />
          ) : responseData ? (
            <pre>{JSON.stringify(responseData, null, 2)}</pre>
          ) : null}{" "}
          {error && (
            <Text
              color={{
                base: "red.500",
              }}
            >
              {JSON.stringify(error, null, 2)}
            </Text>
          )}
        </Box>
        {responseData && (
          <Button
            onClick={downloadCSV}
            bgColor={{
              base: "brand.primary",
            }}
          >
            Export to CSV
          </Button>
        )}
      </Box>
    </Flex>
  );
}

export default Dashboard;
