import Head from "next/head";
import { Inter } from "next/font/google";
import {
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Heading,
} from "@chakra-ui/react";
import { Message } from "@/components/Message";
import { useAppDispatch, useAppSelector } from "@/store";
import { cancelRecording, startRecording, finishRecording } from "@/store/app";
import { useState } from "react";
import {
  FaBullhorn,
  FaUser,
  FaUserFriends,
  FaMicrophone,
  FaCog,
} from "react-icons/fa";
import { SettingsModal } from "@/components/SettingsModal";
import { PrerecordedModal } from "@/components/PrerecordedModal";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const dispatch = useAppDispatch();
  const chat = useAppSelector((s) => s.chat);
  const isSending = useAppSelector((s) => s.isSending);
  const isRecording = useAppSelector((s) => s.isRecording);
  const [speaker, setSpeaker] = useState("Will");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPrerecordedOpen, setIsPrerecordedOpen] = useState(false);

  const buttonProps = { size: "lg", flexShrink: 0 };

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
        <Flex
          justify="space-between"
          align="center"
          width="100%"
          py={2}
          px={4}
          borderBottom="1px"
          borderColor="gray.100"
        >
          <Heading size="md">AI Ventriloquist</Heading>
          <IconButton
            aria-label="Settings"
            icon={<FaCog />}
            onClick={() => setIsSettingsOpen(true)}
          />
        </Flex>
        <Flex flex={1} direction="column-reverse" p={4} gap={4} overflow="auto">
          {[...chat].reverse().map((message, idx) => (
            <Message key={idx} message={message} />
          ))}
        </Flex>
        <Flex
          flexShrink={0}
          width="100%"
          py={2}
          px={4}
          gap={3}
          borderTop="1px"
          borderColor="gray.100"
        >
          {isRecording ? (
            <>
              <Button
                flex={1}
                colorScheme="green"
                onClick={async () => {
                  dispatch(finishRecording())
                    .unwrap()
                    .catch((err) => {
                      console.error(err);
                      alert(err.message);
                    });
                }}
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
                colorScheme="green"
                disabled={isRecording}
                onClick={() => dispatch(startRecording(speaker))}
                leftIcon={<FaMicrophone />}
                {...buttonProps}
              >
                Start recording
              </Button>
              <ButtonGroup isAttached size="lg">
                <IconButton
                  aria-label="Will"
                  icon={<FaUser />}
                  colorScheme={speaker === "Will" ? "blue" : "gray"}
                  onClick={() => setSpeaker("Will")}
                  {...buttonProps}
                />
                <IconButton
                  aria-label="Audience"
                  icon={<FaUserFriends />}
                  colorScheme={speaker === "Audience" ? "blue" : "gray"}
                  onClick={() => setSpeaker("Audience")}
                  {...buttonProps}
                />
              </ButtonGroup>
              <IconButton
                {...buttonProps}
                aria-label="bullhorn"
                icon={<FaBullhorn />}
                onClick={() => setIsPrerecordedOpen(true)}
              />
            </>
          )}
        </Flex>
      </Flex>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <PrerecordedModal
        isOpen={isPrerecordedOpen}
        onClose={() => setIsPrerecordedOpen(false)}
      />
    </>
  );
}
