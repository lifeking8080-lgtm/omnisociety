# OmniSociety - AI-Powered Smart Housing Society Management

> **Team Arjuna | BuildX Hackathon 2025**
> **Track: Best Use of Stellar** ⭐

One platform for Residents, Admins, Security & Vendors. AI handles complaints, billing, visitor validation. **Stellar handles money transparency.**

![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)
![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contract-7D00FF)
![Freighter](https://img.shields.io/badge/Wallet-Freighter-orange)
![MERN](https://img.shields.io/badge/Stack-MERN-green)

---

### 🔗 Stellar Deployment (Live on Testnet)

| Component | ID / Link |
| :--- | :--- |
| **Treasury Wallet (G...)** | `GAXOHAWQFNMA6OJYZXH3UG5VBSV223FFFLFHJOMO3EHIXXIQOEXEVB6W` |
| **Smart Contract (C...)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **Network** | Stellar Testnet |
| **Explorer** | [View on Stellarscan.io/Testnet](https://stellar.expert/explorer/testnet) |
| **Faucet (Friendbot)** | `https://friendbot.stellar.org/?addr=GAXOHAWQFNMA6OJYZXH3UG5VBSV223FFFLFHJOMO3EHIXXIQOEXEVB6W` |

> **How to verify:** Go to `stellarscan.io` -> Switch to **Testnet** -> Paste G... or C... ID in search bar.

---

### 💡 Problem Statement

India has **1.2M+ housing societies** managing **₹50,000 Cr+** with zero tech.

1.  **Maintenance Collection:** No transparency, cash leakage, fake bills.
2.  **Complaints Ignored:** 15-20 days resolution time, no tracking.
3.  **Security Gaps:** Manual registers, unknown visitors.
4.  **Fund Misuse:** No auditable ledger, trust issues between residents and admins.

Existing solutions like MyGate, ApnaComplex only do gate pass + billing. **No blockchain, No AI.**

### 🚀 Solution - OmniSociety = Society OS

A unified OS for housing societies that is 100% digital, transparent, and AI-driven.

**Core Features:**

*   **🤖 AI Complaint Resolver (Gemini 1.5 Pro):** Resident types "Water leakage in flat 302" -> AI auto-tags Category=Plumbing, Priority=High, Suggests Vendor.
*   **💸 Smart Billing & Stellar Payments:** Pay maintenance via UPI or **Pay with Freighter Wallet (XLM)**. Every payment = on-chain transaction visible on explorer.
*   **🛡️ Visitor & Security AI:** QR Visitor pass + Gemini Vision for anomaly detection.
*   **🤝 Vendor & Fund Escrow (Soroban):** Funds locked in Soroban smart contract. `release_payment_to_vendor()` only executes after admin approval. No manipulation.

**Why Better?**

| Feature | MyGate / Others | OmniSociety |
| :--- | :--- | :--- |
| Billing Ledger | Central DB (Editable) | **Stellar Blockchain (Immutable)** |
| Complaints | Manual | **Gemini AI Auto-Resolve** |
| Identity | Password | **Freighter Wallet G... ID** |
| Vendor Payout | Cash / UPI | **Soroban Escrow** |

---

### 🏗️ Technology Stack

**Frontend:**
- Google AI Studio (Rapid UI prototyping)
- React.js + Tailwind CSS
- `@stellar/freighter-api` & `@stellar/stellar-sdk`

**Backend:**
- Node.js + Express
- MongoDB Atlas
- JWT + Stellar G... as passwordless identity

**AI & Blockchain:**
- **Google Gemini 1.5 Pro** - Complaint categorization & resolution
- **Gemini Vision** - Security anomaly
- **Stellar Testnet** - Horizon API `https://horizon-testnet.stellar.org`
- **Soroban (Rust)** - Smart Contract Platform

**Infrastructure:**
- Vercel (Frontend)
- Render (Backend)
- MongoDB Cloud

#### ⭐ Sponsor Technology - Best Use of Stellar

We didn't just use Stellar as a payment button. We used its full power:

1.  **G... Wallet ID as Identity:** No password login. Freighter connect = identity verified.
2.  **C... Contract as Treasury:** All society funds logic lives in contract `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
3.  **Soroban Functions:**
    ```rust
    collect_maintenance(user: Address, amount: i128) // Stores payment log on-chain
    get_total_collection() -> i128 // Transparent total
    approve_expense(vendor: Address, amount: i128) // Admin releases funds
    get_payment_history() // Auditable ledger for all residents
    ```
4.  **Why Stellar over Ethereum?**
    *   Fees: 0.00001 XLM vs $5 on ETH
    *   Speed: 3-5 sec finality
    *   Perfect for micro-transactions like ₹2000 maintenance

---

### 🔧 Installation & Setup

**Prerequisites:** Node.js, Freighter Wallet Extension

```bash
# 1. Clone the repo
git clone https://github.com/TeamArjuna/OmniSociety.git
cd OmniSociety

# 2. Install dependencies
npm install
# or
yarn install

# 3. Setup Environment Variables
# Create .env in root
MONGODB_URI=your_mongodb_atlas_uri
GEMINI_API_KEY=your_google_ai_studio_key
STELLAR_NETWORK=TESTNET
TREASURY_WALLET_ID=GAXOHAWQFNMA6OJYZXH3UG5VBSV223FFFLFHJOMO3EHIXXIQOEXEVB6W
CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC

# 4. Run the project
npm run dev
```

**For Stellar Setup (For Judges/Developers):**

1.  Install Freighter Wallet from Chrome Store
2.  Switch Freighter to **TESTNET** (Settings -> Network -> Testnet)
3.  Fund wallet via Friendbot:
    `https://friendbot.stellar.org/?addr=YOUR_G_WALLET`
4.  Connect wallet on app -> "Login with Freighter"
5.  Click "Pay with Stellar" to test transaction.

---

### 🎬 Product Demonstration Flow

**Live Demo Link:** `https://omnisociety-410808863685.asia-south1.run.app`

**Judge Verification Steps:**

1.  Login -> Click "Login with Freighter" -> Approve (G... ID captured)
2.  Dashboard -> "Due: ₹2000" -> Click "Pay with Stellar (10 XLM Testnet)" -> Sign in Freighter
3.  Go to `stellarscan.io/testnet` -> Paste Tx Hash -> See payment live
4.  Admin Dashboard -> See `Total Collection: 150 XLM | Contract: CDLZFC...`
5.  Raise complaint -> See Gemini AI auto-categorization

---

### 👥 Target Users

*   **Residents (25-55):** Pay transparently, complaints resolved in 2 hours vs 15 days.
*   **Society Admins:** Dashboard with on-chain proof, no trust issues.
*   **Security Guards:** QR pass system.
*   **Vendors:** Instant settlement via Stellar escrow.

**Market:** 1.2M societies in India x ₹12k/year SaaS = **₹1440 Cr TAM**

---

### 💰 Business Model & Roadmap

**Model:**
- SaaS: ₹999/mo (<100 flats), ₹2499/mo (>100 flats)
- 1% Fee on vendor payouts (Mainnet future)
- White-label setup: ₹50k

**Roadmap:**
- **Phase 1 (BuildX - Done):** Billing + AI Complaints + Stellar Testnet ✔️
- **Phase 2 (3 Months):** Mainnet, Mobile App, Society Voting DAO on Stellar
- **Phase 3 (12 Months):** AI Energy Management, Smart City API integration, Pan-India

---

### 📈 Progress During BuildX

**Built in 72 Hours:**
- Day 1: Ideation + MERN Setup + Google AI Studio scaffolding
- Day 2: AI Complaint System + Billing Module
- Day 3: Stellar Integration - Freighter connect (GAXOHAW...B6W) + Contract (CDLZFC...) + Pay button

**Challenges Faced:**
- WASM file generation from Rust - Solved via AI Studio compile + using ready test contract for demo.
- Freighter Testnet switch - Added auto network check.
- Stellar SDK + AI Studio bundling conflict - Used dynamic import.

---

### 👨‍💻 Team Arjuna

| Member | Role |
| Shivraj Shivaji Patil | Team Leader |
|Sanika M Jadhav | Frontend + Freighter Integration |
| Member 2 | Backend + MongoDB |
| Member 3 | AI + Gemini Prompts |
| Member 4 | Stellar Contract + Documentation |

---

### 📄 License

MIT License - Built for BuildX Hackathon 2025

---

**Built with ❤️ for Digital India & Smart Cities Mission**
**Stellar is not a feature, it's our trust layer.**
