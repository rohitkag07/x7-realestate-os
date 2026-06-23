FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8087 NODE_ENV=production
EXPOSE 8087
CMD ["node", "index.js"]
