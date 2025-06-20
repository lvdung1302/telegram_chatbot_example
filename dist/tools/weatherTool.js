"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetWeatherTool = void 0;
const tools_1 = require("@langchain/core/tools");
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function getWeather(city) {
    const apiKey = process.env.WEATHER_API_KEY || 'default_key';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    try {
        const response = await axios_1.default.get(url);
        const { main, weather } = response.data;
        return JSON.stringify({
            temperature: main.temp,
            description: weather[0].description,
            city: response.data.name,
        });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch weather data', details: error.response?.data?.message || error.message });
    }
}
exports.GetWeatherTool = (0, tools_1.tool)(({ city }) => getWeather(city), {
    name: 'get_weather',
    description: 'Get the current weather for a specified city',
    schema: zod_1.z.object({ city: zod_1.z.string().describe('The city name to get weather for') }),
});
