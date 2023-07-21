import React from "react";
import { FormLabel, Text, Flex, Box, Input } from "@chakra-ui/react";
import DatePicker from "react-datepicker";

const CustomInput = React.forwardRef((props: any, ref) => (
  <Input
    {...props}
    ref={ref}
    style={{
      backgroundColor: "gray.100",
      color: "gray.100",
      border: "1",
      borderRadius: "5px",
      width: "200px",
    }}
  />
));

export const DateInput = ({
  mode,
  singleDate,
  setSingleDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dateError,
  backgroundColor,
}) => {
  return (
    <>
      <FormLabel
        mt={{ base: "4", md: "4", lg: "4" }}
        mb={{
          base: "2",
          md: "2",
          lg: "2",
        }}
      >
        Date
      </FormLabel>
      {mode === "single" && (
        <>
          <FormLabel color="gray.600">Single Date</FormLabel>
          <DatePicker
            selected={singleDate}
            onChange={(date) => setSingleDate(date)}
            showTimeSelect
            dateFormat="Pp"
            customInput={<CustomInput />}
            backgroundColor={backgroundColor}
            borderRadius="3"
          />
        </>
      )}
      {mode === "range" && (
        <>
          <Flex direction="row" flexWrap="wrap">
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
                onChange={(date) => setStartDate(date)}
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                dateFormat="Pp"
                customInput={<CustomInput />}
              />
            </Box>
            <Box>
              <FormLabel>End Date</FormLabel>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="Pp"
                customInput={<CustomInput />}
              />
            </Box>
          </Flex>
        </>
      )}
      {dateError && <Text color={{ base: "red.500" }}>{dateError}</Text>}
    </>
  );
};
