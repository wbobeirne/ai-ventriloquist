import fs from "fs";
import formidable, { File } from "formidable";
import { NextApiRequest, NextApiResponse } from "next";
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from "openai";

// Disable body parsing to handle FormData instead of JSON
export const config = {
  api: {
    bodyParser: false,
  },
};

const axiosOptions = { timeout: 20000 };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse and validate form data
  const formData = await new Promise<{
    context: ChatCompletionRequestMessage[];
    speaker: string;
    audio: File;
  }>((resolve, reject) => {
    const form = new formidable.IncomingForm({
      filename: (name, _, part) => {
        if (!part.mimetype) return name;
        return `${name}.webm`;
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.status(500).json({ message: "Error parsing form data" });
        return reject(err);
      }

      if (!fields.context || !fields.speaker || !files.audio) {
        const err = new Error(
          "Missing one of required fields - context, speaker, audio"
        );
        res.status(400).json({ message: err.message });
        return reject(err);
      }

      const context = JSON.parse(
        Array.isArray(fields.context) ? fields.context[0] : fields.context
      );
      const speaker = Array.isArray(fields.speaker)
        ? fields.speaker[0]
        : fields.speaker;
      const audio = Array.isArray(files.audio) ? files.audio[0] : files.audio;

      if (!audio.mimetype?.startsWith("audio/webm")) {
        const err = new Error("Audio must be a webm audio file");
        res.status(400).json({ message: err.message });
        return reject(err);
      }

      resolve({
        context,
        speaker,
        audio,
      });
    });
  });

  console.log({ formData });

  // Initialize OpenAI API
  const openaiConf = new Configuration({
    apiKey: process.env.OPENAI_API_KEY as string,
  });
  const openai = new OpenAIApi(openaiConf);

  // Transcribe audio
  const transcriptionRes = await openai
    .createTranscription(
      // OpenAI types suck, they accept streams
      fs.createReadStream(formData.audio.filepath) as any,
      "whisper-1",
      undefined,
      "json",
      undefined,
      undefined,
      axiosOptions
    )
    .catch((err) => {
      console.log(err?.response?.data);
      res
        .status(500)
        .json({ message: "OpenAI error during audio transcription" });
      throw err;
    });
  const transcript = transcriptionRes.data.text;
  console.log({ transcript });

  // Generate new conversation item
  const conversationRes = await openai
    .createChatCompletion(
      {
        model: "gpt-3.5-turbo",
        messages: [
          ...formData.context,
          {
            role: ChatCompletionRequestMessageRoleEnum.User,
            content: `${formData.speaker}: ${transcript}`,
          },
        ],
      },
      axiosOptions
    )
    .catch((err) => {
      console.log(err?.response?.data);
      res
        .status(500)
        .json({ message: "OpenAI error during audio transcription" });
      throw err;
    });

  // Pull out the actual dialogue
  console.log({
    untrimmedDialogue: conversationRes.data.choices[0].message?.content,
  });
  let dialogue = conversationRes.data.choices[0].message?.content
    .split(":")[1]
    .replace(
      /([^a-zA-Z0-9\_\ \:\;\.\,\/\"\'\?\!\(\)\{\}\\[\]\@\<\>\=\-\+\*#\$&`\|~\^%]+)/g,
      ""
    )
    .trim();
  if (!dialogue) {
    console.warn("No message content in response!", {
      data: conversationRes.data,
    });
    dialogue =
      "Uhh, sorry boss, could you try that again? My circuits are fried.";
  }
  console.log({ dialogue });

  // Generate audio for it
  const voiceId = "VR6AewLTigWG4xSOukaG";
  const audioRes = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: new Headers({
        accept: "audio/mpeg",
        "xi-api-key": process.env.ELEVENLABS_API_KEY as string,
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        text: dialogue,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    }
  );

  if (audioRes.status !== 200) {
    console.log((await audioRes.json())?.detail);
    res
      .status(500)
      .json({ message: "Elevenlabs error during audio generation" });
    try {
      console.error((await audioRes.json())?.detail);
    } catch {
      /* no-op */
    }
    return;
  }

  const audioBuffer = await audioRes.arrayBuffer();
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Length": audioBuffer.byteLength,
    "Content-Disposition": 'attachment; filename="audio.mp3"',
    "X-User-Transcript": transcript,
    "X-Assistant-Transcript": dialogue,
  });
  res.write(Buffer.from(audioBuffer));
  res.end();
}
