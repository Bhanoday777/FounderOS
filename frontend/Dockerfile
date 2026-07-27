# Use node alpine image for lightweight footprint
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency mappings
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Start development server (perfect for hackathon / testing deployments)
CMD ["npm", "run", "dev"]
