import Head from "next/head";
import { Inter } from "next/font/google";
import { Button, ButtonGroup, Flex, IconButton } from "@chakra-ui/react";
import { Message } from "@/components/Message";
import { useAppDispatch, useAppSelector } from "@/store";
import { cancelRecording, startRecording, finishRecording } from "@/store/app";
import { useState } from "react";
import { FaBullhorn } from "react-icons/fa";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const dispatch = useAppDispatch();
  const chat = useAppSelector((s) => s.chat);
  const isSending = useAppSelector((s) => s.isSending);
  const isRecording = useAppSelector((s) => s.isRecording);
  const [speaker, setSpeaker] = useState("Will");

  const buttonProps = { height: "100%", size: "lg" };

  return (
    <>
      <Head>
        <title>AI Ventriloquist</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Flex
        as="main"
        direction="column"
        justify="center"
        align="center"
        height="100dvh"
        className={inter.className}
      >
        <Flex flex={1} direction="column-reverse" p={4} gap={4} overflow="auto">
          {[...chat].reverse().map((message, idx) => (
            <Message key={idx} message={message} />
          ))}
        </Flex>
        <Flex
          flexShrink={0}
          width="100%"
          p={4}
          h={24}
          gap={4}
          borderTop="1px"
          borderColor="gray.100"
        >
          {isRecording ? (
            <>
              <Button
                flex={1}
                colorScheme="green"
                onClick={() => dispatch(finishRecording())}
                {...buttonProps}
              >
                Finish recording
              </Button>
              <Button
                colorScheme="red"
                onClick={() => dispatch(cancelRecording())}
                {...buttonProps}
              >
                Cancel
              </Button>
            </>
          ) : isSending ? (
            <Button flex={1} colorScheme="gray" disabled {...buttonProps}>
              Sending
            </Button>
          ) : (
            <>
              <Button
                flex={1}
                colorScheme="blue"
                disabled={isRecording}
                onClick={() => dispatch(startRecording(speaker))}
                {...buttonProps}
              >
                Start recording
              </Button>
              <ButtonGroup isAttached size="lg">
                <Button
                  colorScheme={speaker === "Will" ? "blue" : "gray"}
                  onClick={() => setSpeaker("Will")}
                  {...buttonProps}
                >
                  Will
                </Button>
                <Button
                  colorScheme={speaker === "Audience" ? "blue" : "gray"}
                  onClick={() => setSpeaker("Audience")}
                  {...buttonProps}
                >
                  Audience
                </Button>
              </ButtonGroup>
              <IconButton
                {...buttonProps}
                aria-label="bullhorn"
                icon={<FaBullhorn />}
                css={{ aspectRatio: "1/1" }}
              />
            </>
          )}
        </Flex>
      </Flex>
    </>
  );
}
