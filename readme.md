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
mkdir D:\DreamTeam\telegram_chatbot_example
cd D:\DreamTeam\telegram_chatbot_example
```

Or clone the repo if it exists:

```bash
git clone "https://github.com/lvdung1302/telegram_chatbot_example.git"
cd telegram_chatbot_example
```

---

### 2. Create enviroments:

```bash
python -m venv .venv
.\.venv\Scripts\Activate
```

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

Update `telegram_bot.ts` with your API key:
use `.env` for better security:

```bash
npm install dotenv
```

Create `.env` file:

```
WEATHER_API_KEY=your_openweather_key
NEWS_API_KEY=your_newsapi_key
TELEGRAM_TOKEN=your_telegram_key
```

---

## ▶️ Running the Script

### (Optional) Activate Virtual Environment for Python (if needed)

```bash
.\.venv\Scripts\Activate
```

### Run the Script

```bash
npx ts-node telegram_bot.ts
```

---

✅ You’re ready to go! The model will now use tool calling to respond to weather, joke, flight, or news queries using real data.
