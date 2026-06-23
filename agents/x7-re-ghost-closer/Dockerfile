FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8086 NODE_ENV=production
EXPOSE 8086
CMD ["node", "index.js"]
