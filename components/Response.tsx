import React from "react";
import {
  Box,
  Heading,
  Button,
  Text,
  useColorModeValue,
  Flex,
  Code,
} from "@chakra-ui/react";

function Response({ responseData, error, isLoading }) {
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
      direction="column"
      justify="space-between"
      flex="1"
      minHeight="70vh"
      maxHeight="70vh"
      backgroundColor={backgroundColor}
      color={color}
      padding={4}
      maxWidth={{
        base: "100%",
        md: "600px",
      }}
      minWidth={{
        base: "100%",
        md: "600px",
      }}
      width="100%"
    >
      <Heading as="h1" size="md" color="brand.primary" fontSize="lg">
        Response
      </Heading>
      <Box overflowY="auto" maxHeight="60vh">
        {responseData && !isLoading ? (
          <Code whiteSpace="pre-wrap">
            {JSON.stringify(responseData, null, 2)}
          </Code>
        ) : null}
        {error && (
          <Code whiteSpace="pre-wrap" color="red.500">
            {JSON.stringify(error, null, 2)}
          </Code>
        )}
      </Box>

      {responseData && !isLoading && (
        <Button variant="default" onClick={downloadCSV}>
          Export to CSV
        </Button>
      )}
    </Flex>
  );
}

export default Response;