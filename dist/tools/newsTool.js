"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetNewsTool = void 0;
const tools_1 = require("@langchain/core/tools");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function getNews() {
    const apiKey = process.env.NEWS_API_KEY || 'default_key';
    const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`;
    try {
        const res = await axios_1.default.get(url);
        const top = res.data.articles.slice(0, 3).map((a) => ({ title: a.title, source: a.source.name }));
        return JSON.stringify({ headlines: top });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch news', details: error.message });
    }
}
exports.GetNewsTool = (0, tools_1.tool)(() => getNews(), {
    name: 'get_news',
    description: 'Get top news headlines',
    schema: {},
});
