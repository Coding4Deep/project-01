# Chat Microservices Application

A production-ready microservices-based chat application with real-time messaging, user management, and image sharing.

## Features

- ✅ User Registration & Authentication (JWT)
- ✅ Real-time Chat (Public & Private)
- ✅ Image Posts with Preview & Resize
- ✅ User Profiles with Image Upload
- ✅ System Monitoring Dashboard
- ✅ Online Users Tracking

## Quick Start

```bash
# Start the application
./start.sh

# Test all services
./test-services.sh

# Access application
http://localhost:3000
```

## Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| Frontend | 3000 | React | Web Interface |
| User Service | 8080 | Spring Boot | Authentication |
| Chat Service | 3001 | Node.js | Real-time Chat |
| Posts Service | 8083 | Go | Image Sharing |
| Profile Service | 8081 | Python FastAPI | User Profiles |
| Monitoring | 8082 | Spring Boot | System Health |

## API Examples

### User Registration
```bash
curl -X POST http://localhost:8080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"user@example.com","password":"password123"}'
```

### User Login
```bash
curl -X POST http://localhost:8080/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123"}'
```

## Development

### Prerequisites
- Docker & Docker Compose

### Commands
```bash
# Start services
./start.sh

# Stop services
docker compose down

# View logs
docker logs chat-microservices-[service-name]-1

# Rebuild service
docker compose build [service-name]
```

## Troubleshooting

1. **Port conflicts**: Ensure ports 3000, 3001, 8080-8083, 5432, 27017, 6379, 9092 are available
2. **Docker issues**: Run `docker compose down` then `./start.sh`
3. **Database issues**: Clear data with `docker volume prune`

## Production Deployment

1. Update environment variables in `docker-compose.yml`
2. Configure SSL/TLS certificates
3. Set up monitoring and logging
4. Configure database backups

---

**Ready for production! 🚀**
