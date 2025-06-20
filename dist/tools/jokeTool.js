"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetJokeTool = void 0;
const tools_1 = require("@langchain/core/tools");
const axios_1 = __importDefault(require("axios"));
async function getJoke() {
    try {
        const res = await axios_1.default.get('https://v2.jokeapi.dev/joke/Any?type=single');
        return JSON.stringify({ joke: res.data.joke });
    }
    catch (error) {
        return JSON.stringify({ error: 'Failed to fetch joke', details: error.message });
    }
}
exports.GetJokeTool = (0, tools_1.tool)(() => getJoke(), {
    name: 'get_joke',
    description: 'Get a random joke',
    schema: {},
});
