# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy nginx configuration template
COPY frontend.conf.template /etc/nginx/templates/frontend.conf.template

# Create necessary directories and set permissions for nginx user
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/scgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/log/nginx \
    /var/run \
    /etc/nginx/conf.d && \
    chown -R nginx:0 /var/cache/nginx \
    /var/log/nginx \
    /var/run \
    /etc/nginx/conf.d \
    /usr/share/nginx/html \
    /etc/nginx/templates

RUN rm /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 8080

USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 