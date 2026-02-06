FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies (production)
COPY package.json ./
RUN npm install --production

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
