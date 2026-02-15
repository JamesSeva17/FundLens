# FundLens 📊
**The Private Wealth Intelligence Dashboard for the Philippines.**

FundLens is a sophisticated, privacy-first financial dashboard designed to consolidate your entire net worth—from traditional Philippine bank accounts and PSE stocks to global crypto holdings—into a single, high-fidelity interface.

---

## 🛡️ Data Sovereignty: Where is my data?
Unlike traditional fintech apps, **FundLens does not have a central server.** Your sensitive financial data is stored using a decentralized, "user-owned" model:

1.  **Local-First Storage**: By default, 100% of your data lives in your browser's `localStorage`. If you clear your browser data, your records are gone unless backed up.
2.  **Optional Cloud Sync (JSONBin)**: If you choose to enable Cloud Sync, your data is sent to a private "Bin" on JSONBin.io that only *your* unique Master Key can access. 
3.  **Stateless AI Processing**: When you use the "AI Fund Manager," your portfolio is sent as a temporary "context note" to Google's Gemini servers. 
    *   **No Training**: Google's API policy ensures your data is **not** used to train their models.
    *   **No Memory**: Once the AI answers your question, the data is immediately discarded. It is functionally "shredded" after every interaction.
4.  **Usage Metrics**: To help the developer improve the app, FundLens includes standard Google Analytics 4 (GA4) integration.
    *   **Anonymized**: We only track feature usage (e.g., "AI Query used") and unique visitor counts.

---

## 🚀 Key Features
- **🇵🇭 PSE Stock Integration**: Direct price fetching for Philippine stocks via PSE Edge.
- **🖼️ Auto-Logo Discovery**: Automatically scrapes and caches institutional logos from TradingView for a premium visual experience.
- **💰 Multi-Platform Tracking**: Group assets by broker (COL Financial) or exchange (Coins.ph, Bybit).
- **📈 Historical Snapshots**: Log your monthly bank balances to visualize long-term wealth growth.
- **🧠 AI Fund Manager**: Leverage Gemini 3 Pro with Google Search grounding for real-time market analysis of your specific holdings.

---

## ⚙️ Configuration Guide

### 1. Activating the Intelligence Engine (AI Setup)
To enable the AI Fund Manager, you need a "Digital Access Key" from Google.
1.  **Generate a Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  **Create API Key**: Click "Create API Key in new project."
3.  **Install**: Copy the key and paste it into the **Settings** tab under "Gemini API Key."
4.  **Sync**: Hit "Sync Models" to choose your preferred AI brain (Gemini 3 Pro is recommended for strategy).

### 2. Setting up the Cloud Vault (JSONBin Setup)
To access your data across multiple devices, you need a private cloud storage bin.
1.  **Get a Master Key**: Create a free account at [JSONBin.io](https://jsonbin.io/) and copy your **Master Key**.
2.  **Link Vault**: Paste the Master Key into the FundLens **Settings**.
3.  **Auto-Initialize**: Click the **"Auto-Gen"** button. FundLens will automatically create a secret "bin" for you and link it.
4.  **Enable**: Toggle "Enable Cloud Sync." Your data is now "portable" across any device where you enter these two keys.

---

## 🤝 Supporting the Project
FundLens is an independent, open-source project. If this tool helps you manage your wealth more effectively, there are several ways you can give back:

- **⭐ Star & Share**: If you are using the GitHub version, leave a star. Sharing the tool with your fellow Filipino investors helps the community grow.
- **🛠️ Technical Feedback**: Found a bug or have a feature request? Submit an issue. Detailed feedback helps maintain the "production-grade" quality of the dashboard.
- **☕ Support the Development**: Maintaining financial scrapers and AI integrations requires significant time. If you'd like to support the continued development of FundLens, you can "Buy me a coffee" or send a tip via Gcash/Maya (check the developer's profile or website for links).
- **📝 Case Studies**: Tell us how the AI Fund Manager helped your strategy! Real-world use cases help us refine the prompts for better financial insights.

---

## 🛠️ For Developers
Built with a modern, high-performance stack:
- **React 19 + TypeScript**: For type-safe, reactive UI components.
- **Tailwind CSS**: Custom "Glassmorphism" design system.
- **Recharts**: For high-performance financial data visualization.
- **Vite**: Ultra-fast build tool and development server.

### Getting Started
```bash
# Install dependencies
npm install

# Launch development environment
npm run dev
```

---
*FundLens is an open-source tool built to empower the Philippine investment community. Manage your wealth with precision and privacy.*