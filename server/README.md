# NutriLens Backend Server

This is the backend API server for the NutriLens mobile application.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```env
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/nutrilens?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
NODE_ENV=development
```

**Important:**
- Get your MongoDB Atlas connection string from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Generate a secure JWT secret (at least 32 characters)
- Never commit the `.env` file to git

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

### 4. Test the Server

Visit `http://localhost:3000/api/health` in your browser. You should see:
```json
{
  "success": true,
  "message": "NutriLens API is running",
  "timestamp": "..."
}
```

## API Endpoints

### Authentication

#### Register
- **POST** `/api/auth/register`
- **Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "age": 25,
  "height": 175,
  "weight": 70,
  "gender": "male",
  "allergens": ["milk", "eggs"]
}
```

#### Login
- **POST** `/api/auth/login`
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
- **GET** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <token>`

#### Update Profile
- **PUT** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
```json
{
  "name": "John Doe",
  "age": 26,
  "height": 176,
  "weight": 71,
  "gender": "male",
  "allergens": ["milk", "eggs", "wheat"]
}
```

## MongoDB Atlas Setup

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string
6. Replace `<password>` and `<dbname>` in the connection string

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to MongoDB
- Check your MongoDB Atlas connection string
- Verify your IP is whitelisted
- Check network connectivity

**Problem:** CORS errors
- The server has CORS enabled for all origins
- If issues persist, check the CORS configuration in `server.js`

### Port Already in Use

If port 3000 is already in use, change the PORT in `.env`:
```env
PORT=3001
```

Then update the API_BASE_URL in the mobile app's `authService.js`

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production` in `.env`
2. Use a strong JWT_SECRET (at least 32 characters)
3. Deploy to a service like:
   - Heroku
   - AWS EC2
   - Google Cloud Platform
   - Azure App Service
4. Update the API_BASE_URL in the mobile app to point to your production server
5. Enable HTTPS/SSL

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Never commit `.env` file to version control
- Use environment variables for all sensitive data

