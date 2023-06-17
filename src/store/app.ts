import { STARTING_CONTEXT } from "@/utils/constants";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ChatCompletionRequestMessage } from "openai";
import { AppState } from ".";

const initialState = {
  chat: [...STARTING_CONTEXT],
  speaker: "Will",
  isRecording: false,
  isSending: false,
  isPlayingAudio: false,
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

let audioStream: MediaStream | undefined;
let audioRecorder: MediaRecorder | undefined;
let audioBlobs: Blob[] | undefined;

export const startRecording = createAsyncThunk<
  void,
  string,
  { state: AppState }
>("app/startRecording", async () => {
  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioRecorder = new MediaRecorder(audioStream);
  audioBlobs = [];

  audioRecorder.addEventListener("dataavailable", (event) => {
    audioBlobs?.push(event.data);
  });

  audioRecorder.start();
});

export const finishRecording = createAsyncThunk<
  AppState["chat"],
  void,
  { state: AppState }
>("app/finishRecording", async (_, { getState }) => {
  if (!audioRecorder) throw new Error("No audio recorder!");

  // Get audio out of active recording
  const audioBlob = await new Promise<Blob>((resolve, reject) => {
    audioRecorder!.addEventListener("stop", () => {
      console.log("stop", audioBlobs);
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

  // API request
  const { chat, speaker } = getState();
  const formData = new FormData();
  formData.append("context", JSON.stringify(chat));
  formData.append("speaker", speaker);
  formData.append("audio", audioBlob);
  const res = await fetch("/api/conversation", {
    method: "POST",
    body: formData,
  });
  console.log(res);

  // Clear out state
  audioStream?.getTracks().forEach((track) => track.stop());
  audioStream = undefined;
  audioRecorder = undefined;
  audioBlobs = undefined;

  // Start playing the audio
  const ctx = new AudioContext();
  const audio = await ctx.decodeAudioData(await res.arrayBuffer());
  const player = ctx.createBufferSource();
  player.buffer = audio;
  player.connect(ctx.destination);
  player.start();

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
