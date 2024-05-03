const express = require('express');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require('fs');
const axios = require('axios');
const catchAsyncError = require('../middleware/catchAsyncError');
// Replace with your actual API key fetching mechanism (e.g., environment variable)
const GOOGLE_API_KEY = process.env.gemini;

// Error handling (consider a more robust error handling approach)
if (!GOOGLE_API_KEY) {
    throw new Error('Missing Google API key. Please set the GOOGLE_API_KEY environment variable.');
}

// Initialize chat history and model (outside the request handler for efficiency)
let chatHistory = [];

const { GoogleGenerativeAI } = require('@google/generative-ai'); // Assuming the correct package name

const genAI = new GoogleGenerativeAI(process.env.gemini);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

exports.voiceGenerate = catchAsyncError(async (req, res, next) => {
    // Assuming the text is sent in the request body under a key named 'text'
    const text = req.body.text;
    const voiceId = req.body.voiceId;
    if (!text) {
        return res.status(400).json({ error: 'Text is required in the request body' });
    }

    // Directory where audio files will be saved
    const directory = `./user/title`;

    // Ensure the directory exists, create it if it doesn't
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }

    var audioFile = `${directory}/${voiceId}.wav`;
    // This example requires environment variables named "SPEECH_KEY" and "SPEECH_REGION"
    const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.speech_subscription_key, process.env.speech_region);
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioFile);

    // The language of the voice that speaks.
    speechConfig.speechSynthesisVoiceName = "en-US-AndrewMultilingualNeural";

    // Create the speech synthesizer.
    var synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    // Start the synthesizer and wait for a result.
    synthesizer.speakTextAsync(text,
        function (result) {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                console.log("Synthesis finished.");
                res.status(200).json({ success: '200' });
            } else {
                console.error("Speech synthesis canceled, " + result.errorDetails +
                    "\nDid you set the speech resource key and region values?");
            }
            synthesizer.close();
            synthesizer = null;
        },
        function (err) {
            console.trace("Error - " + err);
            synthesizer.close();
            synthesizer = null;
        });

    console.log("Now synthesizing to: " + audioFile);

});


async function imagePromptGeneration(story, prpt) {

    const prewrittenPrompts = [
        ` ${story}
        From this story i will be using these line "
         ${prpt}
        "
        In stable diffusion to create a image. Now you as my prompt engineer ChatGpt will generate a prompt that will tell about the characters and their doings first and then tell a short brief about the scenario in where the characters are placed in . You as my prompt engineer will be iteratively revise your prompt and will give me a single prompt which you think will be best for Stable Diffusion text to image input prompt. You will iterate like this format 
        Prompt Iteration 1 then Prompt Iteration 2 then Prompt Iteration 3 then the Final Prompt`,
        "Now you will give me the final prompt as string named 'Final_prompt' in this format 'Final_prompt'='/final_prompt_text/'"
    ];
    let lastResponse = null;

    // Use the existing chat history (no need to start a new chat)
    const chat = await model.startChat({ history: chatHistory });

    for (const prompt of prewrittenPrompts) {
        console.log(prompt);

        // Send pre-written prompt to the model within the existing chat
        const result = await chat.sendMessage(prompt);
        const response = await result.response;

        // Update the chat history within the existing chat
        chatHistory = chat.history;

        // Store the response
        lastResponse = response.text();
        console.log(lastResponse);
    }

    return lastResponse;
}

exports.imageGenerate = catchAsyncError(async (req, res, next) => {
    // Assuming the text is sent in the request body under a key named 'text'
    const story = req.body.story;
    const text = req.body.text;
    const id = req.body.id;
    if (!text) {
        return res.status(400).json({ error: 'Text is required in the request body' });
    }

    const imagePrompt = await imagePromptGeneration(story, text);
    const extractedText = imagePrompt.match(/\/(.*?)\//)[1];

    // Make a POST request to localhost:7860
    try {
        const response = await axios.post('http://localhost:7860', {
            prompt: extractedText
        });

        // Handle response here if needed

        res.status(200).json({ success: '200', final: imagePrompt });
    } catch (error) {
        console.error('Error making POST request to localhost:7860:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
