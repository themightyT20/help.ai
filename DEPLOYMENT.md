# Comprehensive Deployment Guide

This guide will help you deploy the AI Chat Application on Render.com.

## Prerequisites

Before you begin, you'll need:

1. A [Render](https://render.com) account
2. A [GitHub](https://github.com) or [GitLab](https://gitlab.com) account to host your repository
3. API keys for required services (Seper.dev at minimum)

## Step 1: Prepare Your Repository

1. Create a new repository on GitHub or GitLab
2. Push your code to the repository:

```bash
# Initialize Git (if not already done)
git init

# Add your files
git add .

# Commit your changes
git commit -m "Initial commit"

# Add your remote repository
git remote add origin https://github.com/yourusername/your-repo-name.git

# Push to your repository
git push -u origin main
```

## Step 2: Deploy the PostgreSQL Database on Render

1. Log in to your Render account
2. In the dashboard, click on "New" and select "PostgreSQL"
3. Configure your database:
   - Name: `ai-chat-db` (or your preferred name)
   - Database: `ai_chat`
   - User: `ai_chat_user`
   - Select the "Free" plan
4. Click "Create Database"
5. Render will provision your database and provide you with connection details
6. Take note of the "Internal Database URL" - you'll need this for the next step

## Step 3: Deploy the Web Service on Render

### Method 1: Using the Dashboard (Manual)

1. In the Render dashboard, click on "New" and select "Web Service"
2. Connect your GitHub/GitLab repository
3. Configure your web service:
   - Name: `ai-chat-app` (or your preferred name)
   - Environment: `Node`
   - Region: Choose the region closest to your users
   - Branch: `main` (or your default branch)
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Under "Advanced" settings, add the following environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (paste the Internal Database URL from Step 2)
   - `SESSION_SECRET`: (generate a random string or use Render's auto-generated secret)
   - `SEPER_DEV_API_KEY`: (your Seper.dev API key)
   - `PORT`: `5000`
5. Click "Create Web Service"

### Method 2: Using render.yaml (Blueprint)

1. Ensure you have the `render.yaml` file in your repository
2. In the Render dashboard, click on "New" and select "Blueprint"
3. Connect your GitHub/GitLab repository
4. Render will detect the `render.yaml` file and prompt you to deploy the resources
5. Add any required environment variables that are marked as `sync: false`
6. Click "Apply" to deploy both the database and web service

## Step 4: Initialize the Database Schema

After the web service is deployed:

1. Go to your web service in the Render dashboard
2. Click on "Shell" in the top navigation
3. Run the database migration:

```bash
npm run db:push
```

4. This will create all the necessary tables in your database based on your schema

## Step 5: Verify Deployment

1. Once deployment is complete, click on the web service URL provided by Render
2. You should see your AI Chat Application running
3. Register a new account and test the application

## Step 6: Set Up API Keys (If not provided during deployment)

If you didn't add your API keys as environment variables:

1. Log in to your deployed application
2. Navigate to the Settings page
3. Add your API keys:
   - Seper.dev API Key (required for web search)
   - Together AI API Key (optional - for AI model)
   - Stability API Key (optional - for image generation)

## Troubleshooting

### Database Connection Issues

If your application can't connect to the database:

1. Check that the `DATABASE_URL` environment variable is correct
2. Ensure the PostgreSQL service is running on Render
3. Try restarting the web service

### Application Not Starting

If your application doesn't start:

1. Check the logs in the Render dashboard
2. Ensure all required environment variables are set
3. Make sure the database migration was successful

### API Integration Issues

If features like web search or image generation aren't working:

1. Verify your API keys are correctly set up in the application settings
2. Check the application logs for API-specific errors
3. Ensure you have credits/quota remaining for the external APIs

## Managing Your Deployment

### Updating Your Application

When you push changes to your GitHub/GitLab repository, Render will automatically rebuild and redeploy your application.

### Scaling Your Application

If you need more resources:

1. Go to your web service in the Render dashboard
2. Click on "Settings" → "Plan"
3. Choose a plan that meets your requirements

### Custom Domains

To use a custom domain:

1. Go to your web service in the Render dashboard
2. Click on "Settings" → "Custom Domain"
3. Follow the instructions to set up your domain