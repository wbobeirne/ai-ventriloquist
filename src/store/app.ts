import { STARTING_CONTEXT } from "@/utils/constants";
import { whiten } from "@chakra-ui/theme-tools";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatCompletionRequestMessage } from "openai";
import { AppState } from ".";

const initialState = {
  chat: [...STARTING_CONTEXT],
  speaker: "Will",
  isRecording: false,
  isSending: false,
  isPlayingAudio: false,
  audioInputDeviceId: null as string | null,
  audioOutputDeviceId: null as string | null,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    addChatMessage: (
      state,
      action: PayloadAction<ChatCompletionRequestMessage>
    ) => {
      state.chat = [...state.chat, action.payload];
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    setIsSending: (state, action: PayloadAction<boolean>) => {
      state.isSending = action.payload;
    },
    setIsPlayingAudio: (state, action: PayloadAction<boolean>) => {
      state.isPlayingAudio = action.payload;
    },
    setAudioInputDeviceId: (state, action: PayloadAction<string | null>) => {
      state.audioInputDeviceId = action.payload;
    },
    setAudioOutputDeviceId: (state, action: PayloadAction<string | null>) => {
      state.audioOutputDeviceId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startRecording.pending, (state, action) => {
      state.isRecording = true;
      state.speaker = action.meta.arg;
    });
    builder.addCase(startRecording.rejected, (state) => {
      state.isRecording = false;
    });

    builder.addCase(finishRecording.pending, (state) => {
      state.isRecording = false;
      state.isSending = true;
    });
    builder.addCase(finishRecording.fulfilled, (state, action) => {
      state.isSending = false;
      state.chat = action.payload;
    });
    builder.addCase(finishRecording.rejected, (state) => {
      state.isSending = false;
    });

    builder.addCase(cancelRecording.pending, (state) => {
      state.isRecording = false;
      state.isSending = false;
    });
  },
});

export const { addChatMessage, setAudioInputDeviceId, setAudioOutputDeviceId } =
  appSlice.actions;

let audioStream: MediaStream | undefined;
let audioRecorder: MediaRecorder | undefined;
let audioBlobs: Blob[] | undefined;
let beepBoopPromise: Promise<AudioBuffer>;
let ctx: AudioContext;

export const startRecording = createAsyncThunk<
  void,
  string,
  { state: AppState }
>("app/startRecording", async (_, { getState }) => {
  const { audioInputDeviceId } = getState();
  audioStream = await navigator.mediaDevices.getUserMedia({
    audio: audioInputDeviceId ? { deviceId: audioInputDeviceId } : true,
  });
  audioRecorder = new MediaRecorder(audioStream);
  audioBlobs = [];

  audioRecorder.addEventListener("dataavailable", (event) => {
    audioBlobs?.push(event.data);
  });

  audioRecorder.start();

  // Initiailize audio context & fetch beepboop audio if we haven't already
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (!beepBoopPromise) {
    beepBoopPromise = fetch("/audio/processing.mp3")
      .then((res) => res.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer));
  }
});

export const finishRecording = createAsyncThunk<
  AppState["chat"],
  void,
  { state: AppState }
>("app/finishRecording", async (_, { getState }) => {
  // In case `finishRecording` is called before `startRecording`.
  if (!audioRecorder) throw new Error("No audio recorder!");

  const { chat, speaker, audioOutputDeviceId } = getState();

  // Configure audio output device, if specified
  if (audioOutputDeviceId && "setSinkId" in ctx) {
    // Chrome 110+ only, not typed.
    (ctx as any).setSinkId(audioOutputDeviceId);
  }

  // Warm up the audio recording and play some robot noises while we wait.
  // Also useful for bluetooth speakers with delay before audio actually starts playing.
  const beepboopSource = ctx.createBufferSource();
  beepboopSource.buffer = await beepBoopPromise;
  beepboopSource.loop = true;
  beepboopSource.connect(ctx.destination);
  beepboopSource.start();

  // Get audio out of active recording
  const audioBlob = await new Promise<Blob>((resolve, reject) => {
    audioRecorder!.addEventListener("stop", () => {
      if (!audioBlobs) throw new Error("No audio blobs!");
      try {
        resolve(new Blob(audioBlobs, { type: audioBlobs[0].type }));
      } catch (err) {
        reject(err);
      }
    });
    try {
      audioRecorder!.stop();
    } catch (err) {
      reject(err);
    }
  });

  // Clear out recording audio state
  audioStream?.getTracks().forEach((track) => track.stop());
  audioStream = undefined;
  audioRecorder = undefined;
  audioBlobs = undefined;

  // API request
  const formData = new FormData();
  formData.append("context", JSON.stringify(chat));
  formData.append("speaker", speaker);
  formData.append("audio", audioBlob);
  const res = await fetch("/api/conversation", {
    method: "POST",
    body: formData,
  });
  console.log(res);

  // Stop playing the waiting audio, start playing the dialogue audio
  beepboopSource.stop();
  const audio = await ctx.decodeAudioData(await res.arrayBuffer());
  const dialogeSource = ctx.createBufferSource();
  dialogeSource.buffer = audio;
  dialogeSource.connect(ctx.destination);
  dialogeSource.start();

  // Pull data out of headers, return new chat state
  const userDialogue = res.headers.get("X-User-Transcript") || "";
  const assistantDialogue = res.headers.get("X-Assistant-Transcript") || "";
  return [
    ...chat,
    {
      role: "user",
      content: `${speaker}: ${userDialogue}`,
    },
    {
      role: "assistant",
      content: `Robby: ${assistantDialogue}`,
    },
  ];
});

export const cancelRecording = createAsyncThunk(
  "app/cancelRecording",
  async () => {
    // Clear out state
    audioStream?.getTracks().forEach((track) => track.stop());
    audioStream = undefined;
    audioRecorder?.stop();
    audioRecorder = undefined;
    audioBlobs = undefined;
  }
);
