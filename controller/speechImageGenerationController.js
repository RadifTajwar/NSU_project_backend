const express = require('express');
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require('fs');
const catchAsyncError = require('../middleware/catchAsyncError');

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
