<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/53ab18fc-f5f7-4262-94f1-372b4143af38

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## ⚠️ Security Note: Exposed API Key

This app is currently hosted on **GitHub Pages**, which is a static file host. Because there is no backend server, the Gemini API key is embedded directly into the compiled JavaScript bundle at build time. This means **the API key is visible to anyone who inspects the site's source code**.

This is acceptable for internal development and personal use, but **if this tool is deployed for a client organization, the hosting solution must be reconfigured**. The app should be migrated to a platform that supports a backend server (e.g., **Vercel**, **Render**, **Netlify with Functions**, or similar) so the API key can remain on the server side and never be exposed to the browser.
