# AI Chat Application

An advanced AI chat application powered by Mixtral 8x7b, offering a comprehensive conversational experience with cutting-edge features.

## Features

- Advanced AI chat using Mixtral 8x7b
- Web search integration with Seper.dev Google Search API
- Image generation capabilities
- Real-time chat with clickable URLs
- User authentication

## Deployment Instructions for Render

1. **Fork or Clone This Repository**
   Push the code to your GitHub/GitLab account.

2. **Create a Render Account**
   Sign up at [render.com](https://render.com) if you don't have an account.

3. **Deploy via Render Dashboard**

   a. **PostgreSQL Database**:
      - Go to the Render dashboard
      - Click "New" → "PostgreSQL"
      - Configure database name: `ai_chat`
      - Choose the free plan
      - Create database and note the connection string

   b. **Web Service**:
      - Click "New" → "Web Service"
      - Connect your GitHub/GitLab repository
      - Name: `ai-chat-app`
      - Build command: `npm install && npm run build`
      - Start command: `npm start`
      - Select "Environment Variables" and add:
         - `DATABASE_URL`: Your PostgreSQL connection string
         - `NODE_ENV`: production
         - `SEPER_DEV_API_KEY`: Your Seper.dev API key (or set later in dashboard)

4. **Initialize Database**
   After deployment, run database migrations using Render Shell or connect to the database and run them manually.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to 'production' for deployment
- `SEPER_DEV_API_KEY`: API key for Seper.dev search
- `SESSION_SECRET`: Secret for session encryption

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env` file
4. Start the development server: `npm run dev`