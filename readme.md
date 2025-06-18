# 🛠️ Ollama Tool Example

This project shows how to use **LangChain** with **Ollama** to create tools for querying **flight times** and **weather data**.

The script (`flight-times.ts`) uses the `mistral-nemo` model to process user queries, calling tools to:

- Fetch simulated **flight schedules**
- Fetch real-time **weather data** via the **OpenWeatherMap API**

---

## 📋 Prerequisites

- **Node.js**: Version 18 or later  
  👉 [Download here](https://nodejs.org/)

- **Ollama**:  
  👉 [Install from Ollama.com](https://ollama.com/)

- **OpenWeatherMap API Key**:  
  👉 [Sign up for free](https://openweathermap.org/)

- **Windows PowerShell** (adjust commands for macOS/Linux if needed)

- **Internet Connection**:  
  Required for downloading dependencies and fetching weather data.

---

## ⚙️ Setup Instructions

### 1. Create the Project Directory

```powershell
mkdir D:\DreamTeam\ollama-tool-example
cd D:\DreamTeam\ollama-tool-example
```

Or clone the repo if it exists:

```powershell
git clone <repo-url>
cd ollama-tool-example
```

---

### 2. Initialize Node.js Project

```bash
npm init -y
```

---

### 3. Install Dependencies

```bash
npm install @langchain/ollama @langchain/core zod axios
npm install --save-dev ts-node typescript
```

---

### 4. Set Up TypeScript Configuration

Create a file `tsconfig.json` with the following:

```json
{
  "compilerOptions": {
    "target": "ES2016",
    "module": "CommonJS",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": false,
    "skipLibCheck": true,
    "moduleResolution": "node"
  }
}
```

---

### 5. Install and Configure Ollama

```bash
# Start Ollama server in a new terminal
ollama serve

# Pull model
ollama pull mistral-nemo

# Confirm model is installed
ollama list
```

---

### 6. Set Up OpenWeatherMap API Key

Update `flight-times.ts` with your API key:

```ts
const apiKey = "YOUR_API_KEY"; // Replace this
```

Or use `.env` for better security:

```bash
# Install dotenv
npm install dotenv
```

Create `.env` file:

```
WEATHER_API_KEY=your_api_key_here
```

Update code:

```ts
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.WEATHER_API_KEY || "default_key";
```

---

### 7. Update `flight-times.ts`

Ensure your script includes both `get_flight_times` and `get_weather` tools.

To test flight time queries, change this line:

```ts
new HumanMessage({
  content: "What is the flight time from New York (NYC) to Los Angeles (LAX)?",
});
```

---

## ▶️ Running the Script

### (Optional) Activate Virtual Environment

```powershell
.\venv\Scripts\Activate
```

### Start Ollama Server (if not running)

```bash
ollama serve
```

### Run the Script

```bash
npx ts-node flight-times.ts
```

---

✅ You’re ready to go! The model will now use tool calling to respond to weather or flight queries using real data.
