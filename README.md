# 🚀 GITMENTOR – AI GitHub Profile Analyzer

Empowering developers with **AI-powered insights** based on their GitHub activity.

[![Tech Stack](https://img.shields.io/badge/Built%20With-Next.js%2C%20React%2C%20TailwindCSS%2C%20Genkit%2C%20Firebase%2C%20OpenAI-blueviolet)]()
[Live Demo 🔗](https://git-mentor.vercel.app/)

---

## 🧠 Overview

**GITMENTOR** is a smart web application that analyzes GitHub profiles and delivers career-focused feedback using AI. It extracts your GitHub contributions, evaluates coding trends, and suggests personalized improvements – all in a sleek, modern interface.

---

## ✨ Features

- 📊 **Profile Metrics**: Summarizes commits, repositories, stars, and more.
- 🤖 **AI Insights**: Uses OpenAI (via Genkit) to give tailored feedback.
- 🔍 **Skill Analysis**: Identifies dominant technologies and strengths.
- 📈 **Career Suggestions**: Provides growth tips based on activity.
- ⚡ **Real-Time Data**: Integrated directly with the GitHub API.
- 🌗 **Dark/Light Mode**: Smooth theming with `next-themes` and Tailwind.

---

## 🛠 Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, TypeScript
- **AI Integration**: OpenAI via `@genkit-ai/googleai`
- **Backend**: Genkit, Firebase
- **UI & UX**: Radix UI, Lucide React
- **Data Handling**: React Query, React Hook Form, Zod
- **Visualization**: Recharts

---

## 📦 Installation

> Follow these simple steps to run the project locally.

```bash
# 1. Clone the repo
git clone https://github.com/your-username/gitmentor.git
cd gitmentor

# 2. Install dependencies
npm install

# 3. Add environment variables
# Create a `.env.local` file with your GitHub and OpenAI API keys

# 4. Start the dev server
npm run dev

