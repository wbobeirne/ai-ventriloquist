import React from "react";
import { Box, StyleProps, color } from "@chakra-ui/react";
import type { ChatCompletionRequestMessage } from "openai";

interface Props {
  message: ChatCompletionRequestMessage;
}

export const Message: React.FC<Props> = ({ message }) => {
  const styleProps: StyleProps = {
    borderRadius: 8,
    p: 4,
    bg: "gray.50",
    whiteSpace: "pre-wrap",
  };
  if (message.role === "system") {
  } else {
    styleProps.maxWidth = "80%";
    if (message.role === "assistant") {
      styleProps.marginRight = "auto";
      styleProps.bg = "blue.50";
    } else {
      styleProps.marginLeft = "auto";
      styleProps.bg = "green.50";
    }
  }

  return <Box {...styleProps}>{message.content}</Box>;
};
