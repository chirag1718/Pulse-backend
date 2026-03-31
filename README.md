# Pulse Backend

A multi-tenant video upload, processing, and streaming backend application built with Node.js, Express, and MongoDB. Features real-time progress updates, role-based access control, and content moderation.

## Table of Contents

- [Installation and Setup Guide](#installation-and-setup-guide)
- [API Documentation](#api-documentation)
- [User Manual](#user-manual)
- [Architecture Overview](#architecture-overview)
- [Assumptions and Design Decisions](#assumptions-and-design-decisions)

## Installation and Setup Guide

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- FFmpeg (automatically installed via npm)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pulse-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory with the following variables:

   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/pulse
   JWT_SECRET=your-super-secret-jwt-key
   CLIENT_URL=http://localhost:5173
   ```

   - `PORT`: Server port (default: 5000)
   - `MONGO_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT token signing
   - `CLIENT_URL`: Frontend application URL for CORS

4. **Start MongoDB**

   Ensure MongoDB is running locally or update `MONGO_URI` for cloud instance.

5. **Run the application**

   For development:
   ```bash
   npm run dev
   ```

   For production:
   ```bash
   npm start
   ```

6. **Verify installation**

   The server should start and display:
   ```
   MongoDB connected
   Server running on port 5000
   ```

   Test the health endpoint:
   ```bash
   curl http://localhost:5000/api/health
   ```

### Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   └── videoController.js # Video operations
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   ├── rbac.js            # Role-based access control
│   │   └── upload.js          # File upload configuration
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Video.js           # Video schema
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   └── video.js           # Video routes
│   ├── services/
│   │   ├── processingService.js # Video processing
│   │   └── streamingService.js  # Video streaming
│   └── socket/
│       └── socketHandler.js    # WebSocket handling
├── uploads/                    # Video file storage
├── server.js                   # Application entry point
├── src/app.js                  # Express app configuration
└── package.json
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "viewer"
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "tenantId": "tenant-uuid"
  }
}
```

#### POST /api/auth/login
Authenticate user and get token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register.

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "_id": "user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "viewer",
  "tenantId": "tenant-uuid",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### GET /api/auth/users
Get all users (Admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "_id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "viewer",
    "tenantId": "tenant-uuid",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Video Endpoints

#### POST /api/videos/upload
Upload a video file (Editor/Admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

**Form Data:**
- `video`: Video file (mp4, mkv, webm, avi, mov)
- `title`: Video title (required)
- `description`: Video description (optional)

**Response:**
```json
{
  "message": "Video uploaded successfully, processing started",
  "video": {
    "_id": "video-id",
    "title": "Sample Video",
    "description": "",
    "filename": "uuid.mp4",
    "originalName": "sample.mp4",
    "mimetype": "video/mp4",
    "size": 1048576,
    "duration": 0,
    "status": "uploading",
    "sensitivityScore": 0,
    "uploadedBy": "user-id",
    "tenantId": "tenant-uuid",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET /api/videos
Get videos for the user's tenant.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Query Parameters:**
- `status`: Filter by status (uploading, processing, safe, flagged)

**Response:**
```json
[
  {
    "_id": "video-id",
    "title": "Sample Video",
    "description": "",
    "filename": "uuid.mp4",
    "originalName": "sample.mp4",
    "mimetype": "video/mp4",
    "size": 1048576,
    "duration": 120.5,
    "status": "safe",
    "sensitivityScore": 0.75,
    "uploadedBy": {
      "_id": "user-id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "tenantId": "tenant-uuid",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/videos/:id
Get a specific video by ID.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:** Single video object as above.

#### GET /api/videos/:id/stream
Stream a video file (only if status is 'safe').

**Headers:**
```
Authorization: Bearer <jwt-token>
Range: bytes=0-1023
```

**Response:** Video file stream with appropriate headers.

#### DELETE /api/videos/:id
Delete a video (Editor/Admin only).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Video deleted successfully"
}
```

### WebSocket Events

#### Connection
Clients can connect to receive real-time updates.

#### Progress Updates
Server emits progress events during video processing:

```javascript
socket.on(`progress:${videoId}`, (data) => {
  console.log('Progress:', data.progress); // 0-100
});
```

### Error Responses

All endpoints may return the following error formats:

```json
{
  "message": "Error description"
}
```

Common HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## User Manual

### User Roles

- **Viewer**: Can view videos and their own profile
- **Editor**: Can upload, view, and delete videos
- **Admin**: Full access including user management

### Getting Started

1. **Register**: Create an account with name, email, and password
2. **Login**: Use email and password to authenticate
3. **Upload Videos**: Editors/Admins can upload video files
4. **Monitor Processing**: Watch real-time progress via WebSocket
5. **Stream Videos**: Access approved videos through streaming endpoint

### Video Upload Guidelines

- Supported formats: MP4, MKV, WebM, AVI, MOV
- Maximum file size: 500MB
- Videos undergo automatic processing and content moderation
- Only "safe" videos can be streamed

### API Usage Examples

#### JavaScript (Frontend)

```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token } = await loginResponse.json();

// Upload video
const formData = new FormData();
formData.append('video', file);
formData.append('title', 'My Video');
formData.append('description', 'Description');

const uploadResponse = await fetch('/api/videos/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

// WebSocket for progress
const socket = io();
socket.on(`progress:${videoId}`, (data) => {
  updateProgress(data.progress);
});
```

#### cURL Examples

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'

# Get videos
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/videos
```

## Architecture Overview

### System Architecture

The application follows a layered architecture:

```
┌─────────────────┐
│   Client App    │
│   (Frontend)    │
└─────────────────┘
         │
    HTTP/WebSocket
         │
┌─────────────────┐
│   Express API   │
│   Middleware    │
│   Routes        │
│   Controllers   │
└─────────────────┘
         │
    Database I/O
         │
┌─────────────────┐
│    MongoDB      │
│   (Database)    │
└─────────────────┘
         │
    File System
         │
┌─────────────────┐
│   File Storage  │
│   (uploads/)    │
└─────────────────┘
```

### Key Components

#### 1. Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-tenant isolation

#### 2. Video Processing Pipeline
- File upload with validation
- Metadata extraction (duration)
- Content sensitivity analysis
- Status management

#### 3. Streaming Service
- Range request support
- Efficient file streaming
- Access control

#### 4. Real-time Communication
- Socket.io for progress updates
- Event-driven architecture

### Data Flow

1. **User Registration/Login**
   - User data stored in MongoDB
   - JWT token generated and returned

2. **Video Upload**
   - File stored in uploads/ directory
   - Metadata saved to database
   - Background processing initiated

3. **Video Processing**
   - FFmpeg extracts duration
   - Sensitivity analysis performed
   - Status updated to 'safe' or 'flagged'

4. **Video Streaming**
   - Access control check
   - File streamed with range support

### Security Measures

- Password hashing with bcrypt
- JWT token authentication
- CORS configuration
- Helmet security headers
- File type validation
- Role-based permissions

## Assumptions and Design Decisions

### Multi-Tenant Architecture

**Assumption**: The system needs to support multiple isolated tenants.

**Decision**: Each user is assigned a `tenantId` UUID. Videos and users are scoped by tenant. Registration creates a new tenant per user, but admins can manage tenant assignments (though not fully implemented in current version).

### Content Moderation

**Assumption**: Videos need automatic content screening.

**Decision**: Implemented a simulated sensitivity analysis based on video duration:
- Videos > 5 minutes: 40% chance of being flagged
- Videos ≤ 5 minutes: 10% chance of being flagged
- Real implementation would use AI/ML services

### File Storage

**Assumption**: Videos are stored locally for simplicity.

**Decision**: Files stored in `uploads/` directory with UUID filenames. In production, consider cloud storage (AWS S3, Google Cloud Storage) for scalability.

### Real-time Updates

**Assumption**: Users need immediate feedback on video processing.

**Decision**: Socket.io integration for progress updates. Events emitted during processing pipeline.

### Role-Based Access

**Assumption**: Different user types need different permissions.

**Decision**: Three roles implemented:
- Viewer: Read-only access
- Editor: Can upload/delete videos
- Admin: Full access including user management

### Video Processing

**Assumption**: Processing should be asynchronous to avoid blocking uploads.

**Decision**: Background processing with progress tracking. FFmpeg used for metadata extraction.

### API Design

**Assumption**: RESTful API with JSON responses.

**Decision**: Standard REST endpoints with proper HTTP status codes and error handling.

### Database Choice

**Assumption**: Need flexible schema for user and video data.

**Decision**: MongoDB with Mongoose ODM for schema validation and relationships.

### Authentication

**Assumption**: Stateless authentication for scalability.

**Decision**: JWT tokens with 7-day expiration. Password hashing with bcrypt.

### File Upload Limits

**Assumption**: Need to prevent abuse with large files.

**Decision**: 500MB limit per video, video format validation.

### Error Handling

**Assumption**: Robust error handling for production use.

**Decision**: Global error handler, consistent error response format.

This documentation provides a comprehensive overview of the Pulse Backend application. For development contributions, ensure all new features include appropriate tests and documentation updates.
