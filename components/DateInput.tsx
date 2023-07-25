import React from "react";
import {
  FormLabel,
  Text,
  Flex,
  Box,
  Input,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import DatePicker from "react-datepicker";
import { InfoOutlineIcon } from "@chakra-ui/icons";

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
      marginBottom: "10px",
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
  singleUnixTime,
  setSingleUnixTime,
  startUnixTime,
  setStartUnixTime,
  endUnixTime,
  setEndUnixTime,
}) => {
  const handleDateChange = (setDate, setUnixTime, date) => {
    setDate(date);
    setUnixTime(Math.floor(date.getTime() / 1000));
  };

  const handleUnixChange = (setDate, setUnixTime, unixTime) => {
    if (isNaN(unixTime) || unixTime === "" || unixTime.length > 10) {
      return;
    }
    setDate(new Date(unixTime * 1000));
    setUnixTime(unixTime);
  };

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
        <Tooltip
          label="The date and time in your local timezone. The response timestamps will be in UTC. The date and time will be converted to a Unix timestamp and sent to the API"
          fontSize="md"
          placement="right-start"
        >
          <span>
            <Icon as={InfoOutlineIcon} boxSize={3} ml={2} mb="2px" />
          </span>
        </Tooltip>
      </FormLabel>

      {mode === "single" && (
        <>
          <FormLabel color="gray.600">Single Date</FormLabel>
          <DatePicker
            selected={singleDate}
            onChange={(date) =>
              handleDateChange(setSingleDate, setSingleUnixTime, date)
            }
            showTimeSelect
            dateFormat="Pp"
            timeFormat="HH:mm"
            customInput={<CustomInput />}
            backgroundColor={backgroundColor}
            borderRadius="3"
          />
          <FormLabel color="gray.600">Unix Timestamp</FormLabel>
          <Input
            value={singleUnixTime}
            onChange={(e) =>
              handleUnixChange(setSingleDate, setSingleUnixTime, e.target.value)
            }
            width="200px"
            mb={{
              base: "10px",
              md: "10px",
            }}
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
                onChange={(date) =>
                  handleDateChange(setStartDate, setStartUnixTime, date)
                }
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                dateFormat="Pp"
                timeFormat="HH:mm"
                customInput={<CustomInput />}
              />
              <FormLabel color="gray.600">Start Unix Timestamp</FormLabel>
              <Input
                value={startUnixTime}
                onChange={(e) =>
                  handleUnixChange(
                    setStartDate,
                    setStartUnixTime,
                    e.target.value
                  )
                }
                width="200px"
                mb={{
                  base: "10px",
                  md: "10px",
                }}
              />
            </Box>
            <Box>
              <FormLabel>End Date</FormLabel>
              <DatePicker
                selected={endDate}
                onChange={(date) =>
                  handleDateChange(setEndDate, setEndUnixTime, date)
                }
                showTimeSelect
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="Pp"
                timeFormat="HH:mm"
                customInput={<CustomInput />}
              />
              <FormLabel>End Unix Timestamp</FormLabel>
              <Input
                value={endUnixTime}
                onChange={(e) =>
                  handleUnixChange(setEndDate, setEndUnixTime, e.target.value)
                }
                width="200px"
                mb={{
                  base: "10px",
                  md: "10px",
                }}
              />
            </Box>
          </Flex>
        </>
      )}
      {dateError && <Text color={{ base: "red.500" }}>{dateError}</Text>}
    </>
  );
};
