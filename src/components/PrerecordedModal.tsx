import { useAppDispatch } from "@/store";
import { addChatMessage } from "@/store/app";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Flex,
} from "@chakra-ui/react";
import { ChatCompletionRequestMessage } from "openai";
import React, { useEffect, useRef, useState } from "react";

const PRERECORDED_AUDIO: {
  label: string;
  url: string;
  chat?: ChatCompletionRequestMessage[];
}[] = [
  {
    label: "Dialup sound",
    url: "/audio/dialup.mp3",
  },
  {
    label: "Dale impersonation",
    url: "/audio/impersonation.mp3",
    chat: [
      {
        role: "user",
        content:
          "Will: So Robby, there's been a lot of talk in the news about things like deep fakes and impersonating people. Is that something you can do?",
      },
      {
        role: "assistant",
        content:
          "Robby: Oh, sure, imitating humans is easy. Let me just adjust my voice modulator here and... \"Hi, my name is Dale. What's a girl got to do to get a matcha latte around here? Well, I'm going to go join the Collective Unconsciousness and take a nap, bye!\"... Not bad if I do say so myself. Maybe I'll try calling your bank next, to make a sudden withdrawal.",
      },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrerecordedModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const [playUrl, setPlayUrl] = useState<string>();
  const soundRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (audio: (typeof PRERECORDED_AUDIO)[number]) => {
    setPlayUrl(audio.url);
    const sound = new Audio(audio.url);
    sound.play();
    sound.onended = () => setPlayUrl(undefined);
    soundRef.current = sound;
    if (audio.chat) {
      audio.chat.forEach((msg) => dispatch(addChatMessage(msg)));
    }
  };

  const handleStop = () => {
    if (soundRef.current) {
      soundRef.current.pause();
      soundRef.current.currentTime = 0;
      soundRef.current = null;
      setPlayUrl(undefined);
    }
  };

  // Pre-load
  useEffect(() => {}, []);

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Prerecorded audio</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={4} pb={4}>
            {PRERECORDED_AUDIO.map((audio) => (
              <React.Fragment key={audio.url}>
                <Button
                  colorScheme={playUrl === audio.url ? "red" : "blue"}
                  onClick={() =>
                    playUrl === audio.url ? handleStop() : handlePlay(audio)
                  }
                  height={10}
                >
                  {playUrl === audio.url ? "Stop" : audio.label}
                </Button>
                <audio
                  src={audio.url}
                  preload="auto"
                  style={{ visibility: "hidden" }}
                />
              </React.Fragment>
            ))}
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
