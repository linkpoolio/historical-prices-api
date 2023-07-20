import React, { useState } from "react";
import axios from "axios";
import { Flex } from "@chakra-ui/react";
import Form from "../components/Form";
import Response from "../components/Response";

function Dashboard2() {
  const [responseData, setResponseData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (
    contractAddress,
    chain,
    singleDate,
    startDate,
    endDate,
    mode
  ) => {
    try {
      let response;
      setIsLoading(true);

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
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Flex
      width="100%"
      height="100vh"
      padding={{
        base: "50",
        md: "50",
        lg: "100",
      }}
      align="center"
      justify="center"
      gap="50"
    >
      <Form fetchData={fetchData} isLoading={isLoading} />
      <Response
        responseData={responseData}
        error={error}
        isLoading={isLoading}
      />
    </Flex>
  );
}

export default Dashboard2;
