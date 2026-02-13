
# FundLens 📊

**FundLens** is a modern personal net-worth and investment dashboard specifically designed for users in the Philippines. It combines manual tracking of bank balances with automated, platform-aware tracking of Philippine stocks and global cryptocurrencies.

## 🚀 Key Features

- **Monthly Snapshots:** Track your total liquid net worth (banks, e-wallets, cash) over time.
- **Advanced Portfolio Tracking:**
  - **COL Financial:** Automated PH stock price tracking.
  - **Coins.ph:** Native crypto-to-PHP pricing.
  - **Bybit:** Real-time crypto conversion to PHP.
- **Gemini AI Integration:**
  - **Live Search:** Uses Google Search grounding to fetch platform-specific prices.
  - **Auto-Discovery:** Automatically fetches official logos for your assets.
- **Dynamic Dashboard:** Visual metrics including MoM growth, asset allocation, and interactive charts.
- **Privacy First:** Data stays in your browser's `localStorage` unless you opt-in to cloud sync.
- **Cloud Sync:** Optional manual sync via JSONBin.

## 🛠️ How to Run Locally

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set your environment variable:**
   The app expects `process.env.API_KEY` for Gemini integration. You can create a `.env` file or export it in your shell.
4. **Start the development server:**
   ```bash
   npm run dev
   ```

## 🌐 Deploy to GitHub Pages

This project includes a `.github/workflows/deploy.yml` file for automatic deployment.

1. Create a GitHub secret named `GEMINI_API_KEY` with your Google AI Studio API key.
2. Push your code to the `main` branch.
3. The app will be built and deployed automatically.

## ☁️ Cloud Sync (JSONBin)

To enable cloud sync:
1. Create an account at [jsonbin.io](https://jsonbin.io/).
2. Create a new Private Bin with an empty object `{}`.
3. Obtain your **Master Key** and **Bin ID**.
4. Enter these in the **Settings** tab of FundLens and toggle "Enable Sync".

## 🛡️ Architecture

- **React + TypeScript:** For a type-safe, maintainable frontend.
- **Tailwind CSS:** For premium, responsive UI design.
- **Recharts:** For lightweight, high-performance financial data visualization.
- **Gemini SDK (@google/genai):** Powering the intelligent data fetching layer.

---
*Built with ❤️ for the PH Financial Community.*
