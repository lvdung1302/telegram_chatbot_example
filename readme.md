# 🛠️ Ollama Tool Example

This project shows how to use **LangChain** with **Ollama** to create tools for querying **flight times**, **weather data**, **jokes**, and **news**.

The script (`main.ts`) uses the `mistral-nemo` model to process user queries, calling tools to:

- Fetch simulated **flight schedules**
- Fetch real-time **weather data** via the **OpenWeatherMap API**
- Tell **jokes**
- Summarize **news headlines**

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
git clone "https://github.com/lvdung1302/ollama-tool-example.git"
cd ollama-tool-example
```

---

### 2. Initialize Node.js Project

```bash
npm init -y
```

---

### 3. Install Dependencies

You can install all required packages with:

```bash
pip install -r requirements.txt
```

> Or for macOS/Linux:

```bash
xargs -n 1 npm install < requirements.txt
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

### 6. Set Up API Keys

Update `main.ts` with your API key:

```ts
const apiKey = "YOUR_API_KEY"; // Replace this
```

Or use `.env` for better security:

```bash
npm install dotenv
```

Create `.env` file:

```
WEATHER_API_KEY=your_openweather_key
NEWS_API_KEY=your_newsapi_key
```

---

### 7. Update `main.ts`

Ensure your script includes all tools: `get_weather`, `get_joke`, `get_news`, and `get_flight_times`.

Test input example:

```ts
new HumanMessage({
  content:
    "Tell me a joke, give me the current weather in Hanoi, and summarize the latest top news headlines.",
});
```

---

## ▶️ Running the Script

### (Optional) Activate Virtual Environment for Python (if needed)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate
```

### Run the Script

```bash
npx ts-node main.ts
```

---

✅ You’re ready to go! The model will now use tool calling to respond to weather, joke, flight, or news queries using real data.
