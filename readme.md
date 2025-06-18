Ollama Tool Example

This project shows how to use LangChain with Ollama to create tools for querying flight times and weather data. The script (flight-times.ts) uses the mistral-nemo model to process user queries, calling tools to fetch flight schedules (simulated) and real-time weather data via the OpenWeatherMap API.

Prerequisites

Node.js: Version 18 or later. Download from https://nodejs.org/.

Ollama: Install from https://ollama.com/.

OpenWeatherMap API Key: Sign up at https://openweathermap.org/ to get a free API key.

Windows: This guide assumes you're using Windows (e.g., PowerShell). Adjust commands for other OS if needed.

Internet Connection: Required for downloading dependencies and fetching weather data.

Setup Instructions

Create the Project Directory:

Open PowerShell and create a folder: mkdir D:\DreamTeam\ollama-tool-example cd D:\DreamTeam\ollama-tool-example

If this project is on GitHub, clone it instead: git clone cd ollama-tool-example

Initialize Node.js Project:

Create a package.json file: npm init -y

Install Dependencies:

Install required Node.js packages: npm install @langchain/ollama @langchain/core zod axios npm install --save-dev ts-node typescript

Set Up TypeScript Configuration:

Create a tsconfig.json file in the project root with this content: { "compilerOptions": { "target": "ES2016", "module": "CommonJS", "esModuleInterop": true, "forceConsistentCasingInFileNames": true, "strict": false, "skipLibCheck": true, "moduleResolution": "node" } }

Install and Configure Ollama:

Download and install Ollama from https://ollama.com/.

Start the Ollama server in a separate terminal: ollama serve

Pull the mistral-nemo model: ollama pull mistral-nemo

Verify the model is installed: ollama list

Set Up OpenWeatherMap API Key:

The script uses an API key for weather data. Replace the hardcoded key in flight-times.ts: const apiKey = 'YOUR_API_KEY'; // Replace with your key

For better security, use a .env file:

Install dotenv: npm install dotenv

Create a .env file in the project root: WEATHER_API_KEY=your_api_key_here

Update flight-times.ts to use the environment variable: import dotenv from 'dotenv'; dotenv.config(); const apiKey = process.env.WEATHER_API_KEY || 'default_key';

Create or Update flight-times.ts:

Ensure flight-times.ts contains the script with both get_flight_times and get_weather tools (use the provided script in the project).

The script queries weather by default. To test flight times, change the query in flight-times.ts: new HumanMessage({ content: 'What is the flight time from New York (NYC) to Los Angeles (LAX)?' })

Running the Script

Activate Virtual Environment (Optional):

If using a virtual environment, activate it: .\venv\Scripts\Activate

Start Ollama Server:

Ensure the Ollama server is running: ollama serve

Run the Script:

Execute the script using ts-node: npx ts-node main.ts
