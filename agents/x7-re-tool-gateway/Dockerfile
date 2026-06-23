FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8081 NODE_ENV=production
EXPOSE 8081
CMD ["node", "index.js"]
