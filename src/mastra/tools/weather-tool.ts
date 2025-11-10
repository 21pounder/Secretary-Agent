import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location. Supports city names in both Chinese and English (e.g., "北京", "Beijing", "Shanghai", "上海"). Returns temperature in Celsius, humidity percentage, wind speed in km/h, and bilingual weather conditions.',
  inputSchema: z.object({
    location: z.string().describe('City name in Chinese or English (e.g., "北京", "Beijing", "Shanghai")'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, { en: string; zh: string }> = {
    0: { en: 'Clear sky', zh: '晴朗' },
    1: { en: 'Mainly clear', zh: '基本晴朗' },
    2: { en: 'Partly cloudy', zh: '局部多云' },
    3: { en: 'Overcast', zh: '阴天' },
    45: { en: 'Foggy', zh: '有雾' },
    48: { en: 'Depositing rime fog', zh: '浓雾' },
    51: { en: 'Light drizzle', zh: '小雨' },
    53: { en: 'Moderate drizzle', zh: '中雨' },
    55: { en: 'Dense drizzle', zh: '大雨' },
    56: { en: 'Light freezing drizzle', zh: '小冻雨' },
    57: { en: 'Dense freezing drizzle', zh: '大冻雨' },
    61: { en: 'Slight rain', zh: '小雨' },
    63: { en: 'Moderate rain', zh: '中雨' },
    65: { en: 'Heavy rain', zh: '大雨' },
    66: { en: 'Light freezing rain', zh: '小冻雨' },
    67: { en: 'Heavy freezing rain', zh: '大冻雨' },
    71: { en: 'Slight snow fall', zh: '小雪' },
    73: { en: 'Moderate snow fall', zh: '中雪' },
    75: { en: 'Heavy snow fall', zh: '大雪' },
    77: { en: 'Snow grains', zh: '米雪' },
    80: { en: 'Slight rain showers', zh: '阵雨' },
    81: { en: 'Moderate rain showers', zh: '中阵雨' },
    82: { en: 'Violent rain showers', zh: '暴雨' },
    85: { en: 'Slight snow showers', zh: '小阵雪' },
    86: { en: 'Heavy snow showers', zh: '大阵雪' },
    95: { en: 'Thunderstorm', zh: '雷暴' },
    96: { en: 'Thunderstorm with slight hail', zh: '雷暴伴小冰雹' },
    99: { en: 'Thunderstorm with heavy hail', zh: '雷暴伴大冰雹' },
  };

  // Return both English and Chinese for the agent to choose based on user's language
  const condition = conditions[code] || { en: 'Unknown', zh: '未知' };
  return `${condition.zh} / ${condition.en}`;
}
