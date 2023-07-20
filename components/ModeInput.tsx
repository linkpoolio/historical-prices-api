import React from "react";
import { RadioGroup, Stack, Radio, FormLabel } from "@chakra-ui/react";

export const ModeInput = ({ mode, setMode }) => {
  return (
    <>
      <FormLabel mt={{ base: "4", md: "4", lg: "4" }}>Mode</FormLabel>
      <RadioGroup onChange={setMode} value={mode}>
        <Stack direction="row">
          <Radio value="single">Single Date</Radio>
          <Radio value="range">Date Range</Radio>
        </Stack>
      </RadioGroup>
    </>
  );
};
