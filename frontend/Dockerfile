FROM node:20-alpine as build

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Build
COPY . .
RUN npm run build

# Production
FROM nginx:1.25-alpine

# Copy build
COPY --from=build /app/dist /usr/share/nginx/html

# NGINX config für SPA
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    client_max_body_size 5000m; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/ { \
        proxy_pass http://backend-api:8000; \
        proxy_request_buffering off; \
        client_max_body_size 5000m; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
