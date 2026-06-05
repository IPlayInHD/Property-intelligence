import axios from "axios";

export async function getWorldBankGdpGrowth(): Promise<number> {
  try {
    const response = await axios.get(
      "https://api.worldbank.org/v2/country/AE/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=5&mrv=5",
      { timeout: 10000 }
    );
    const entries = response.data?.[1] ?? [];
    const valid = entries.filter((e: { value: number | null }) => e.value !== null);
    if (valid.length) {
      const avg = valid.reduce((s: number, e: { value: number }) => s + e.value, 0) / valid.length;
      return avg;
    }
  } catch {
    console.warn("World Bank GDP fetch failed, using fallback 3.0%");
  }
  return 3.0;
}

export async function getWorldBankPopulationGrowth(): Promise<number> {
  try {
    const response = await axios.get(
      "https://api.worldbank.org/v2/country/AE/indicator/SP.POP.GROW?format=json&per_page=3&mrv=3",
      { timeout: 10000 }
    );
    const entries = response.data?.[1] ?? [];
    const valid = entries.filter((e: { value: number | null }) => e.value !== null);
    if (valid.length) {
      return valid[0].value as number;
    }
  } catch {
    console.warn("World Bank population fetch failed, using fallback 1.5%");
  }
  return 1.5;
}
