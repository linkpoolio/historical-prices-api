import React from "react";
import {
  Input,
  FormLabel,
  FormControl,
  FormErrorMessage,
  Flex,
  Link,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { InfoOutlineIcon } from "@chakra-ui/icons";

export const RPCInput = ({ rpc, setRPC, rpcError }) => {
  return (
    <FormControl isInvalid={!!rpcError}>
      <Flex mt={{ base: "4", md: "4", lg: "4" }} alignItems="center">
        <FormLabel
          mb={{
            base: "2",
            md: "2",
            lg: "2",
          }}
        >
          RPC URL
        </FormLabel>{" "}
        <Link href={"https://chainlist.org/"} m="0" isExternal color="blue.500">
          <ExternalLinkIcon
            mx="1px"
            mb={{
              base: "2",
              md: "2",
              lg: "2",
            }}
          />
        </Link>
      </Flex>
      <Input
        placeholder="https://example.com"
        value={rpc}
        onChange={(e) => setRPC(e.target.value)}
      />
      <FormErrorMessage>{rpc}</FormErrorMessage>
    </FormControl>
  );
};
