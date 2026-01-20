<div align="center">

![Bird-CDN Header](https://i.ibb.co/R4dpTg9V/Unbenannt-1.png)

# 🐦 Bird-CDN

### High-Performance Content Delivery Network with Management Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://www.docker.com/)
[![Version](https://img.shields.io/badge/Version-Alpha-red)](https://github.com/netz-sg/cdn-network)

**⚠️ ALPHA VERSION - This project is currently in active development and may contain bugs or incomplete features. Use in production environments at your own risk.**

---

### Built With

<p align="center">
  <a href="https://nginx.org/"><img src="https://img.shields.io/badge/NGINX-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="NGINX"/></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/></a>
  <a href="https://min.io/"><img src="https://img.shields.io/badge/MinIO-C72E49?style=for-the-badge&logo=minio&logoColor=white" alt="MinIO"/></a>
  <a href="https://prometheus.io/"><img src="https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white" alt="Prometheus"/></a>
  <a href="https://grafana.com/"><img src="https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white" alt="Grafana"/></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/></a>
</p>

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Services](#-services)
- [API Documentation](#-api-documentation)
- [Monitoring](#-monitoring)
- [Configuration](#-configuration)
- [Production Deployment](#-production-deployment)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 About

**Bird-CDN** is a complete, self-hosted Content Delivery Network solution designed for serving images and videos at scale. Built with modern technologies and best practices, it provides enterprise-grade caching, monitoring, and management capabilities.

### Key Highlights

- 🚀 **High Performance** - NGINX-powered edge caching with optimized configuration
- 📦 **S3-Compatible Storage** - MinIO for reliable object storage
- 🎨 **Modern Admin UI** - React-based dashboard for easy management
- 📊 **Built-in Monitoring** - Prometheus + Grafana for real-time insights
- 🔧 **RESTful API** - Complete management API with documentation
- 🐳 **Docker-First** - Easy deployment and scaling
- 🆓 **Open Source** - MIT License, free to use and modify

---

## 🎯 Features

### Core Features

- ✅ **NGINX Edge Cache** - Optimized for images & videos with Range Requests support
- ✅ **MinIO Origin Storage** - S3-compatible object storage backend
- ✅ **FastAPI Backend** - Modern REST API for management & cache operations
- ✅ **React Admin UI** - User-friendly dashboard with real-time statistics
- ✅ **Prometheus + Grafana** - Comprehensive monitoring & analytics
- ✅ **Image Transformation API** - On-the-fly resize, crop, and format conversion with intelligent caching
- ✅ **Video Streaming** - HLS support with adaptive bitrate streaming
- ✅ **SSL/TLS Support** - Automated Let's Encrypt certificate management
- ✅ **Cache Management** - Purge by file, bucket, or pattern
- ✅ **Bandwidth Tracking** - Detailed usage statistics and reports
- ✅ **WebP Support** - Automatic image format optimization

### Advanced Features

- 🎬 **Range Requests** - Efficient video seeking
- 📈 **Real-time Metrics** - Cache hit/miss ratios, bandwidth, requests
- 🔐 **JWT Authentication** - Secure API and admin access
- 🌍 **Multi-bucket Support** - Organize content by projects
- ⚡ **Redis Caching** - Fast metadata and session storage
- 📝 **Comprehensive Logging** - Detailed request and error logs

---

## 📦 Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  NGINX CDN Edge (Port 80/443)      │
│  - Cache Layer                      │
│  - SSL Termination                  │
│  - Load Balancing                   │
└──────┬──────────────────────────────┘
       │ (Cache MISS)
       ▼
┌─────────────────────────────────────┐
│  MinIO Origin Storage (Port 9000)  │
│  - S3-Compatible Object Store       │
│  - Multi-bucket Support             │
└─────────────────────────────────────┘

┌─────────────────┐  ┌──────────────┐
│  Backend API    │──│ PostgreSQL   │
│  (Port 8000)    │  │ Database     │
└─────────────────┘  └──────────────┘
         │
         ▼
    ┌────────┐
    │ Redis  │
    │ Cache  │
    └────────┘

┌─────────────────┐  ┌──────────────┐
│  Admin UI       │  │  Monitoring  │
│  (Port 3000)    │  │  - Grafana   │
└─────────────────┘  │  - Prometheus│
                     └──────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.29+
- At least 4GB RAM
- 20GB disk space

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/netz-sg/cdn-network.git
cd cdn-network

# 2. Create environment configuration
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. View logs
docker-compose logs -f
```

### Initial Configuration

```bash
# 1. Access MinIO Console (http://localhost:9011)
#    Login: admin / adminpassword123
#    Create a bucket named "media"

# 2. Test file upload
curl -X POST http://localhost:8000/api/upload \
  -F "file=@image.jpg" \
  -F "bucket=media"

# 3. Access via CDN
curl -I http://localhost/media/image.jpg
# First request: X-Cache-Status: MISS
# Second request: X-Cache-Status: HIT
```

---

## 🌐 Services

After starting, the following services are available:

| Service | URL | Description | Default Credentials |
|---------|-----|-------------|---------------------|
| **CDN Edge** | http://localhost | NGINX cache layer | - |
| **Admin UI** | http://localhost:3000 | Management dashboard | admin / admin123 |
| **Backend API** | http://localhost:8000 | REST API ([Docs](http://localhost:8000/docs)) | - |
| **MinIO Console** | http://localhost:9011 | Storage management | admin / adminpassword123 |
| **Grafana** | http://localhost:3001 | Monitoring dashboards | admin / admin |
| **Prometheus** | http://localhost:9090 | Metrics collection | - |

> **⚠️ Security Warning**: Change all default passwords before deploying to production!

---

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Quick API Examples

#### Upload a File
```bash
POST /api/upload
Content-Type: multipart/form-data

curl -X POST http://localhost:8000/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@image.jpg" \
  -F "bucket=media"
```

#### Purge Cache (Single File)
```bash
DELETE /api/cache/purge?path=/media/image.jpg

curl -X DELETE "http://localhost:8000/api/cache/purge?path=/media/image.jpg" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Purge Cache (Entire Bucket)
```bash
DELETE /api/cache/purge/bucket/{bucket_name}

curl -X DELETE http://localhost:8000/api/cache/purge/bucket/media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Cache Statistics
```bash
GET /api/stats/cache

curl http://localhost:8000/api/stats/cache \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Bandwidth Report
```bash
GET /api/stats/bandwidth?days=7

curl http://localhost:8000/api/stats/bandwidth?days=7 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 Monitoring

### Grafana Dashboards

Access Grafana at **http://localhost:3001**

**Default Credentials:**
- Username: `admin`
- Password: `admin`

**Pre-configured Dashboards:**
- 📈 CDN Performance Overview
- 💾 Cache Hit/Miss Ratios
- 🌐 Bandwidth Usage
- 🚀 Request Rates & Latency
- 💽 Storage Capacity
- 🖥️ System Health

### Prometheus Metrics

Access Prometheus at **http://localhost:9090**

**Available Metrics:**
- `nginx_http_requests_total` - Total HTTP requests
- `nginx_cache_status` - Cache hit/miss status
- `bandwidth_bytes_total` - Total bandwidth usage
- `storage_usage_bytes` - Storage capacity
- `response_time_seconds` - Request latency

---

## 🎬 Video Optimization

Bird-CDN includes advanced video delivery features:

### Supported Features
- ✅ **Range Requests** - Efficient video seeking and partial content delivery
- ✅ **HLS Streaming** - HTTP Live Streaming with M3U8 playlists
- ✅ **Adaptive Bitrate** - Multiple quality levels
- ✅ **Slice Uploads** - Handle large video files
- ✅ **Smart Caching** - Intelligent segment caching

### Example: HLS Streaming
```bash
# Upload video segments
curl -X POST http://localhost:8000/api/upload \
  -F "file=@video.m3u8" \
  -F "bucket=videos"

# Access via CDN
http://localhost/videos/video.m3u8
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Domain Configuration
CDN_DOMAIN=cdn.yourdomain.com
CDN_PROTOCOL=https

# Database
DATABASE_URL=postgresql://cdn:cdn123@postgres:5432/cdn

# MinIO Storage
MINIO_ENDPOINT=origin-storage:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=adminpassword123

# Redis
REDIS_URL=redis://redis:6379

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# SSL/TLS (Production)
LETSENCRYPT_EMAIL=your-email@example.com
LETSENCRYPT_STAGING=false
```

### NGINX Cache Tuning

Edit `nginx/nginx.conf` to adjust cache settings:

```nginx
# Increase cache size
proxy_cache_path /var/cache/nginx/cdn
  levels=1:2
  keys_zone=cdn_cache:100m
  max_size=100g        # Increase from 50g
  inactive=60d         # Keep cached content longer
  use_temp_path=off;
```

### Video Streaming Optimization

Edit `nginx/conf.d/cdn.conf`:

```nginx
# Larger buffers for video streaming
proxy_buffer_size 64k;
proxy_buffers 16 64k;
proxy_busy_buffers_size 128k;
```

---

## 🌍 Production Deployment

### Automated SSL Setup (Recommended)

```bash
# 1. Configure domain and email in .env
nano .env
# Set: CDN_DOMAIN=cdn.yourdomain.com
#      LETSENCRYPT_EMAIL=your-email@example.com
#      LETSENCRYPT_STAGING=false

# 2. Run automated setup script
chmod +x start-with-ssl.sh
./start-with-ssl.sh

# ✨ Done! Your CDN is now running with HTTPS
```

**The script automatically:**
1. ✅ Starts all Docker services
2. ✅ Requests Let's Encrypt certificate
3. ✅ Configures NGINX for HTTPS
4. ✅ Restarts services with SSL enabled
5. ✅ Completes in ~2 minutes

### Manual SSL Setup

See detailed guides:
- [AUTO_SSL_SETUP.md](AUTO_SSL_SETUP.md) - Automated setup (recommended)
- [SSL_QUICKSTART.md](SSL_QUICKSTART.md) - Quick reference
- [SSL_SETUP.md](SSL_SETUP.md) - Manual setup with troubleshooting

### Production Recommendations

```yaml
# docker-compose.yml adjustments for production
nginx-cdn:
  environment:
    - CDN_CACHE_SIZE=100g      # Increase cache size
    - CDN_CACHE_INACTIVE=60d   # Longer retention
  restart: always

backend-api:
  environment:
    - WORKERS=4                # Increase workers
  restart: always
```

### Scaling Considerations

For multi-region deployments:
1. 🌐 Deploy additional NGINX edge nodes in different regions
2. 🗺️ Use GeoDNS for region-based routing
3. 🔄 Configure MinIO multi-site replication
4. 💾 Use shared PostgreSQL database for centralized management
5. 📊 Aggregate metrics from all regions in Grafana

---

## 🔐 Security

### Pre-Deployment Checklist

- [ ] Change all default passwords in `.env`
- [ ] Generate strong JWT secret keys
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules (allow only ports 80, 443)
- [ ] Rotate MinIO access keys
- [ ] Enable API rate limiting
- [ ] Configure admin UI authentication
- [ ] Set up fail2ban for brute force protection
- [ ] Enable HSTS headers
- [ ] Configure CORS policies

### Security Best Practices

```bash
# Generate secure JWT secret
openssl rand -hex 32

# Change admin password via API
curl -X PATCH http://localhost:8000/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"admin123","new_password":"your-secure-password"}'

# Change admin username
curl -X PATCH http://localhost:8000/auth/change-username \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_username":"yourusername","password":"your-password"}'
```

---

## 🐛 Troubleshooting

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f nginx-cdn
docker-compose logs -f backend-api
```

### Clear Cache Completely

```bash
# Clear NGINX cache
docker-compose exec nginx-cdn rm -rf /var/cache/nginx/*
docker-compose restart nginx-cdn
```

### Restart Services

```bash
# Single service
docker-compose restart nginx-cdn

# All services
docker-compose restart

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Common Issues

**Issue: Port already in use**
```bash
# Find process using port
sudo lsof -i :80
# Kill process or change port in docker-compose.yml
```

**Issue: Permission denied**
```bash
# Fix permissions
sudo chown -R $(whoami):$(whoami) ./nginx/cache
sudo chown -R $(whoami):$(whoami) ./storage
```

---

## 👥 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation
- Ensure all tests pass

### Reporting Issues

Please include:
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Docker version)
- Relevant logs

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 netz-sg

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

Built with amazing open-source technologies:
- [NGINX](https://nginx.org/) - High-performance web server
- [MinIO](https://min.io/) - S3-compatible object storage
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - UI library
- [PostgreSQL](https://www.postgresql.org/) - Relational database
- [Redis](https://redis.io/) - In-memory data store
- [Prometheus](https://prometheus.io/) - Monitoring system
- [Grafana](https://grafana.com/) - Observability platform

---

## 📞 Support

- 📖 [Documentation](https://github.com/netz-sg/cdn-network/wiki)
- 🐛 [Issue Tracker](https://github.com/netz-sg/cdn-network/issues)
- 💬 [Discussions](https://github.com/netz-sg/cdn-network/discussions)

---

<div align="center">

**⭐ If you find this project useful, please consider giving it a star! ⭐**

Made with ❤️ by [netz-sg](https://github.com/netz-sg)

</div>
