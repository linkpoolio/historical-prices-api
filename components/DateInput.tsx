import React from "react";
import { FormLabel, Text, Flex, Box } from "@chakra-ui/react";
import DatePicker from "react-datepicker";

export const DateInput = ({
  mode,
  singleDate,
  setSingleDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dateError,
}) => {
  return (
    <>
      <FormLabel mt={{ base: "4", md: "4", lg: "4" }}>Date</FormLabel>
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
          <Flex direction="row">
            <Box
              mr={{
                base: "4",
                md: "4",
                lg: "4",
              }}
            >
              <FormLabel color="gray.600">Start Date</FormLabel>
              <DatePicker
                selected={startDate}
                onSelect={(date) => setStartDate(date)}
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                dateFormat="Pp"
              />
            </Box>
            <Box>
              <FormLabel>End Date</FormLabel>
              <DatePicker
                selected={endDate}
                onSelect={(date) => setEndDate(date)}
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="Pp"
              />
            </Box>
          </Flex>
        </>
      )}
      {dateError && <Text color={{ base: "red.500" }}>{dateError}</Text>}
    </>
  );
};
