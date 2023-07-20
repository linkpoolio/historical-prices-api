import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Heading, Box, Container, Flex } from "@chakra-ui/react";

export const NavigationBar = () => {
  return (
    <Box bg="brand.white" as="header">
      <Container py="6" px="4" maxW="container.2xl">
        <Flex as="nav" height={10} alignItems="center" gap="8">
          <Heading
            display={{ base: "none", md: "inline" }}
            as="h1"
            size="md"
            color="brand.primary"
            fontSize="lg"
            fontWeight="800"
          >
            Historical Price Data
          </Heading>

          <Flex alignItems="center" justifyContent="space-between" flex="1">
            <Flex gap="6">Documentation</Flex>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};
