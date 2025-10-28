# Frontend Dockerfile (Multi-stage build)

# --- Build Stage ---
FROM oven/bun:1 as build

ARG VITE_API_SECRET_KEY
ARG VITE_FRONTEND_PASSWORD
ENV VITE_API_SECRET_KEY=$VITE_API_SECRET_KEY
ENV VITE_FRONTEND_PASSWORD=$VITE_FRONTEND_PASSWORD

WORKDIR /app

# Copy package management files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN bun run build

# --- Serve Stage ---
FROM nginx:1.25-alpine as final

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the Nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
