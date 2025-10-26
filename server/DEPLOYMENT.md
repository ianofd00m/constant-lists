# Render Deployment Configuration for Constant Lists Backend

## Build Configuration
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node.js
- **Root Directory:** `server`

## Environment Variables to Set in Render:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: constant-lists-secret_$_0104060911
- `NODE_ENV`: production
- `PORT`: (Render sets this automatically)

## Database Setup:
1. Create a free MongoDB Atlas cluster
2. Get the connection string
3. Replace localhost URI with Atlas URI

## Deployment Steps:
1. Push code to GitHub
2. Connect Render to GitHub repository  
3. Set root directory to "server"
4. Configure environment variables
5. Deploy

## Local Development:
Your local setup will continue to work with localhost MongoDB.
The deployed version will use Atlas MongoDB.